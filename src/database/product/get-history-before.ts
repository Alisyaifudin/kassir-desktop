import { DB } from "../instance";
import { Effect } from "effect";

export type ProductHistory = {
  qty: number;
  paidAt: number;
  capital: number;
  capitalRaw: number;
  mode: DB.Mode;
  price: number;
};

type DbOutput = {
  record_paid_at: number;
  record_product_qty: number;
  record_mode: DB.Mode;
  record_product_capital: number;
  record_product_capital_raw: number;
  record_product_price: number;
};

export function getHistoryBefore(id: string, timestamp: number, limit: number, mode: DB.Mode) {
  return Effect.gen(function* () {
    const [raw, total] = yield* Effect.all([
      DB.try((db) =>
        db.select<DbOutput[]>(
          `SELECT records.record_paid_at, record_product_qty, record_mode, record_product_capital, record_product_price, 
           record_product_capital_raw
					FROM record_products 
          INNER JOIN records ON records.record_id = record_products.record_id
					WHERE product_id = $1 AND record_mode = $2 AND record_paid_at < $3
					ORDER BY records.record_paid_at DESC
					LIMIT $4
					`,
          [id, mode, timestamp, limit],
        ),
      ),
      DB.try((db) =>
        db.select<{ count: number }[]>(
          `SELECT COUNT(*) as count
					 FROM record_products INNER JOIN records ON records.record_id = record_products.record_id
					 WHERE product_id = $1 AND record_mode = $2`,
          [id, mode],
        ),
      ).pipe(Effect.map((r) => r[0].count)),
    ]);
    const histories: ProductHistory[] = raw.map((r) => ({
      capital: r.record_product_capital,
      mode: r.record_mode,
      paidAt: r.record_paid_at,
      qty: r.record_product_qty,
      price: r.record_product_price,
      capitalRaw: r.record_product_capital_raw,
    }));
    return {
      histories,
      total,
    };
  });
}
