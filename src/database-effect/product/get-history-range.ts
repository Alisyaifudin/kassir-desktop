import { DB } from "../instance";
import { Effect } from "effect";

export type ProductHistory = {
  qty: number;
  timestamp: number;
  mode: DB.Mode;
};

type Output = {
  timestamp: number;
  record_product_qty: number;
  record_mode: DB.Mode;
};

export function getHistoryRange(id: number, start: number, end: number) {
  return DB.try((db) =>
    db.select<Output[]>(
      `SELECT records.timestamp, record_product_qty, record_mode
					FROM record_products 
          INNER JOIN records ON records.timestamp = record_products.timestamp
					WHERE product_id = $1 AND records.timestamp BETWEEN $2 AND $3
					ORDER BY records.timestamp DESC
					`,
      [id, start, end],
    ),
  ).pipe(
    Effect.map((res) =>
      res.map((r) => ({
        mode: r.record_mode,
        qty: r.record_product_qty,
        timestamp: r.timestamp,
      })),
    ),
  );
}
