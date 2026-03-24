// import { formatDate } from "~/lib/date";
import { DB } from "../instance";
import { Effect } from "effect";

export type ProductHistory = {
  qty: number;
  paidAt: number;
  mode: DB.Mode;
};

type Output = {
  record_paid_at: number;
  record_product_qty: number;
  record_mode: DB.Mode;
};

export function getHistoryRange(id: string, start: number, end: number) {
  return DB.try((db) =>
    db.select<Output[]>(
      `SELECT records.record_paid_at, record_product_qty, record_mode
       FROM record_products 
       INNER JOIN records ON records.record_id = record_products.record_id
       WHERE product_id = $1 AND records.record_paid_at BETWEEN $2 AND $3
       ORDER BY records.record_paid_at DESC
      `,
      [id, start, end],
    ),
  ).pipe(
    Effect.map((res) =>
      res.map((r) => ({
        mode: r.record_mode,
        qty: r.record_product_qty,
        paidAt: r.record_paid_at,
      })),
    ),
  );
}
