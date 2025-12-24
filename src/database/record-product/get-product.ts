import { DefaultError, err, ok, Result, tryResult } from "~/lib/utils";
import { getDB } from "../instance";

export type RecordProduct = {
  id: number;
  stock: number;
  qty: number;
};
export async function getProduct(
  timestamp: number
): Promise<Result<DefaultError, RecordProduct[]>> {
  const db = await getDB();
  const [errMsg, rows] = await tryResult({
    run: () =>
      db.select<{ product_id: number; product_stock: number; record_product_qty: number }[]>(
        `SELECT products.product_id, product_stock, record_product_qty FROM products 
        INNER JOIN record_products ON record_products.product_id = products.product_id
        WHERE timestamp = $1`,
        [timestamp]
      ),
  });
  if (errMsg !== null) return err(errMsg);
  return ok(
    rows.map((r) => ({ id: r.product_id, stock: r.product_stock, qty: r.record_product_qty }))
  );
}
