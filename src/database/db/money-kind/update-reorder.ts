import { Effect } from "effect";
import { DB } from "../instance";

export function updateReorder(items: { order: number; id: string }[]) {
  if (items.length === 0) return Effect.void;
  const now = Date.now();
  let bindingIndex = 1;
  let query = "";
  const bindings: unknown[] = [];
  for (const item of items) {
    query += `UPDATE money_kind SET money_kind_ordering = $${bindingIndex++}, money_kind_updated_at = $${bindingIndex++},
      money_kind_sync_at = null WHERE money_kind_id = $${bindingIndex++};\n`;
    bindings.push(item.order, now, item.id);
  }
  return DB.try((db) => db.execute(`BEGIN TRANSACTION;\n${query}COMMIT`, bindings)).pipe(
    Effect.asVoid,
  );
}
