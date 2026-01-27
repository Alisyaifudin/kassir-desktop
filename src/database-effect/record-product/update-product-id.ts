import { DefaultError, tryResult } from "~/lib/utils";
import { getDB } from "../instance";

export async function updateProductId(
  recordProductId: number,
  productId: number | null
): Promise<DefaultError | null> {
  const db = await getDB();
  const [errMsg] = await tryResult({
    run: () =>
      db.execute("UPDATE record_products SET product_id = $1 WHERE record_product_id = $2", [
        productId,
        recordProductId,
      ]),
  });
  return errMsg;
}
