import { Effect } from "effect";
import { DB } from "../instance";

export function countUnsync(productId: string) {
  return DB.try((db) =>
    db.select<{ count: number }[]>(
      `SELECT COUNT(*) AS count FROM product_events 
      WHERE product_id = $1 AND sync_at IS NULL`,
      [productId],
    ),
  ).pipe(Effect.map((res) => res[0].count));
}
