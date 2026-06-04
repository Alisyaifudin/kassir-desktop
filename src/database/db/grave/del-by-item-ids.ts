import { DB } from "../instance";
import { Effect } from "effect";

export function delByItemIds(itemIds: string[]) {
  if (itemIds.length === 0) return Effect.succeed(undefined);
  let bindingIndex = 1;
  const placeholders = itemIds.map(() => `$${bindingIndex++}`).join(", ");
  return DB.try((db) =>
    db.execute(`DELETE FROM graves WHERE grave_item_id IN (${placeholders})`, itemIds),
  ).pipe(Effect.asVoid);
}
