import { DB } from "../instance";
import { Effect } from "effect";

export type RecordProduct = {
  id: string;
  paidAt: number;
  name: string;
  price: number;
  qty: number;
  mode: DB.Mode;
};

type Output = {
  record_paid_at: number;
  record_product_id: string;
  record_product_name: string;
  record_product_qty: number;
  record_product_price: number;
  record_mode: DB.Mode;
};

export function getHistory(start: number, end: number, query: string) {
  return DB.try((db) =>
    db.select<Output[]>(
      `SELECT records.paid_at, record_product_id, record_product_name, record_product_qty, 
         record_product_price, record_mode
         FROM record_products
         INNER JOIN records ON records.record_id = record_products.record_id
         WHERE records.record_paid_at BETWEEN $1 AND $2 AND record_product_name LIKE '%' || LOWER($3) || '%'
         ORDER BY records.record_paid_at DESC`,
      [start, end, query.trim().toLowerCase()],
    ),
  ).pipe(
    Effect.map((rows) =>
      rows.map((r) => ({
        id: r.record_product_id,
        mode: r.record_mode,
        name: r.record_product_name,
        price: r.record_product_price,
        qty: r.record_product_qty,
        paidAt: r.record_paid_at,
      })),
    ),
  );
}
