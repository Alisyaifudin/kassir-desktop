import { Effect } from "effect";
import { DB } from "../instance";

export function updatePocketReorder(items: { order: number; id: string }[], now: number) {
  if (items.length === 0) return Effect.void;
  let bindingIndex = 1;
  const queries = items.map(
    () =>
      `UPDATE pocket SET pocket_ordering = $${bindingIndex++}, pocket_updated_at = $${bindingIndex++},
      pocket_sync_at = null WHERE pocket_id = $${bindingIndex++};`,
  );
  const bindings = items.flatMap((item) => [item.order, now, item.id]);
  return DB.execute(`BEGIN TRANSACTION;\n${queries.join("\n")}COMMIT`, bindings).pipe(
    Effect.asVoid,
  );
}
