import { DefaultError, err, ok, Result, tryResult } from "~/lib/utils";
import { getDB } from "../instance";

export type Product = {
  id: number;
  name: string;
  barcode?: string;
  qty: number;
};

export async function getPerformance(
  start: number,
  end: number,
  mode: DB.Mode
): Promise<Result<DefaultError, Product[]>> {
  const db = await getDB();
  const [errMsg, rows] = await tryResult({
    run: () =>
      db.select<
        {
          product_id: number;
          product_name: string;
          product_barcode: string | null;
          qty: number;
          record_mode: DB.Mode;
        }[]
      >(
        `SELECT p.product_id, p.product_name, p.product_barcode, SUM(rp.record_product_qty) AS qty, record_mode
        FROM products AS p
        INNER JOIN record_products AS rp ON p.product_id = rp.product_id
        INNER JOIN records ON records.timestamp = rp.timestamp
        WHERE rp.timestamp BETWEEN $1 AND $2 AND record_mode = $3
        GROUP BY p.product_id, p.product_name, p.product_barcode
        ORDER BY qty DESC`,
        [start, end, mode]
      ),
  });
  if (errMsg !== null) return err(errMsg);
  return ok(
    rows.map((r) => ({
      id: r.product_id,
      name: r.product_name,
      qty: r.qty,
      barcode: r.product_barcode ?? undefined,
    }))
  );
}
