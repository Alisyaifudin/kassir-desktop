import { Effect } from "effect";
import { DB } from "../instance";
import { calcStock } from "../product/calc-stock";

export function setSyncAt(productId: string, eventIds: string[], timestamp: number) {
  if (eventIds.length === 0) return Effect.void;
  let bindingIndex = 1;
  const placeholders = eventIds.map(() => `$${++bindingIndex}`).join(", ");
  return Effect.gen(function* () {
    yield* DB.try((db) =>
      db.execute(`UPDATE product_events SET sync_at = $1 WHERE id IN (${placeholders})`, [
        timestamp,
        ...eventIds,
      ]),
    );
    yield* calcStock(productId);
  });
}
