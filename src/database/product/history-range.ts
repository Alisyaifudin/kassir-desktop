import { err, ok, Result, tryResult } from "~/lib/utils";
import { getDB } from "../instance";

export type ProductHistory = {
  qty: number;
  timestamp: number;
  mode: DB.Mode;
};

export async function getHistoryRange(
  id: number,
  start: number,
  end: number
): Promise<Result<"Aplikasi bermasalah", ProductHistory[]>> {
  const db = await getDB();
  const [errMsg, res] = await tryResult({
    run: () =>
      db.select<
        {
          timestamp: number;
          record_product_qty: number;
          record_mode: DB.Mode;
        }[]
      >(
        `SELECT records.timestamp, record_product_qty, record_mode
					FROM record_products 
          INNER JOIN records ON records.timestamp = record_products.timestamp
					WHERE product_id = $1 AND records.timestamp BETWEEN $2 AND $3
					ORDER BY records.timestamp DESC
					`,
        [id, start, end]
      ),
  });
  if (errMsg !== null) return err(errMsg);
  return ok(
    res.map((r) => ({
      mode: r.record_mode,
      qty: r.record_product_qty,
      timestamp: r.timestamp,
    }))
  );
}
