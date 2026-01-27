import { DefaultError, err, ok, Result, tryResult } from "~/lib/utils";
import { getDB } from "../instance";

export type RecordProduct = {
  id: number;
  timestamp: number;
  name: string;
  price: number;
  qty: number;
  mode: DB.Mode;
};

export async function getHistory(
  start: number,
  end: number,
  query: string
): Promise<Result<DefaultError, RecordProduct[]>> {
  const db = await getDB();
  const [errMsg, rows] = await tryResult({
    run: () =>
      db.select<
        {
          timestamp: number;
          record_product_id: number;
          record_product_name: string;
          record_product_qty: number;
          record_product_price: number;
          record_mode: DB.Mode;
        }[]
      >(
        `SELECT records.timestamp, record_product_id, record_product_name, record_product_qty, 
         record_product_price, record_mode
         FROM record_products
         INNER JOIN records ON records.timestamp = record_products.timestamp
         WHERE records.timestamp BETWEEN $1 AND $2 AND record_product_name LIKE '%' || LOWER($3) || '%'
         ORDER BY records.timestamp DESC`,
        [start, end, query.trim().toLowerCase()]
      ),
  });
  if (errMsg !== null) return err(errMsg);
  return ok(
    rows.map((r) => ({
      id: r.record_product_id,
      mode: r.record_mode,
      name: r.record_product_name,
      price: r.record_product_price,
      qty: r.record_product_qty,
      timestamp: r.timestamp,
    }))
  );
}
