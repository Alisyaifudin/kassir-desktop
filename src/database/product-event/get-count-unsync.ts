import { Effect } from "effect";
import { DB } from "../instance";

export function countUnsync() {
  return DB.try((db) =>
    db.select<{ count: number }[]>(
      `SELECT COUNT(*) AS count FROM product_events 
      WHERE sync_at IS NULL`,
    ),
  ).pipe(Effect.map((res) => res[0].count));
}
