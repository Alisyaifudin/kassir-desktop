import { redirect } from "react-router";
import { db } from "~/database";
import { DefaultError, log } from "~/lib/utils";

export async function delAction(timestamp: number) {
  const [errMode, mode] = await db.record.get.mode(timestamp);
  if (errMode !== null) {
    log.error("Failed to get record mode");
    return errMode;
  }
  const [errProd, products] = await db.recordProduct.get.product(timestamp);
  if (errProd !== null) {
    log.error("Failed to get record products with product id");
    return errProd;
  }
  const sign = mode === "buy" ? -1 : 1;
  const promises: Promise<DefaultError | null>[] = [];
  for (const p of products) {
    const stock = p.stock + sign * p.qty;
    promises.push(db.product.update.stock({ id: p.id, stock }));
  }
  const res = await Promise.all(promises);
  for (const errMsg of res) {
    if (errMsg !== null) {
      log.error("Failed to update stock");
      return errMsg;
    }
  }
  const errMsg = await db.record.delByTimestamp(timestamp);
  if (errMsg !== null) {
    log.error("Failed to delete record");
    return errMsg;
  }
  throw redirect(`/records?timestamp=${timestamp}&mode=${mode}`);
}
