import { Temporal } from "temporal-polyfill";
import { db } from "~/database";
import { constructCSV, err, log, ok, Result } from "~/lib/utils";

export async function productAction(): Promise<Result<string, { name: string; csv: string }>> {
  const [errMsg, csv] = await getCSV();
  if (errMsg !== null) {
    return err(errMsg);
  }
  const today = Temporal.Now.instant();
  const name = `products_${today.epochMilliseconds}.csv`;
  return ok({ name, csv });
}

async function getCSV(): Promise<Result<string, string>> {
  const [errMsg, products] = await db.product.get.all();
  if (errMsg !== null) {
    log.error(errMsg);
    return err(errMsg);
  }
  const csv = constructCSV(products);
  return ok(csv);
}
