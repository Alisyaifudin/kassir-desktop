import { err, ok, Result, tryResult } from "~/lib/utils";
import { getDB } from "../instance";

export type ProductHistory = {
  qty: number;
  timestamp: number;
  capital: number;
  mode: DB.Mode;
};

export async function getHistory(
  id: number,
  offset: number,
  limit: number,
  mode: "buy" | "sell"
): Promise<Result<"Aplikasi bermasalah", { histories: ProductHistory[]; total: number }>> {
  const db = await getDB();
  const [errMsg, res] = await tryResult({
    run: () =>
      Promise.all([
        db.select<
          {
            timestamp: number;
            record_product_qty: number;
            record_mode: DB.Mode;
            record_product_capital: number;
          }[]
        >(
          `SELECT records.timestamp, record_product_qty, record_mode, record_product_capital
					FROM record_products 
          INNER JOIN records ON records.timestamp = record_products.timestamp
					WHERE product_id = $1 AND record_mode = $2
					ORDER BY records.timestamp DESC
					LIMIT $3
					OFFSET $4
					`,
          [id, mode, limit, offset]
        ),
        db.select<{ count: number }[]>(
          `SELECT COUNT(*) as count
						 FROM record_products INNER JOIN records ON records.timestamp = record_products.timestamp
						 WHERE product_id = $1 AND record_mode = $2`,
          [id, mode]
        ),
      ]),
  });
  if (errMsg !== null) return err(errMsg);
  const histories = res[0];
  const total = res[1][0].count;
  return ok({
    histories: histories.map((r) => ({
      capital: r.record_product_capital,
      mode: r.record_mode,
      timestamp: r.timestamp,
      qty: r.record_product_qty,
    })),
    total,
  });
}
