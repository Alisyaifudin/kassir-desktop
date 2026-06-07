import { Effect } from "effect";
import { DB } from "../instance";

export function deleteManyPocketSync(ids: string[], now: number) {
  if (ids.length === 0) return Effect.void;
  let bindingIndex = 1;
  const queries = ids.map(
    () =>
      `UPDATE pocket SET pocket_deleted_at = $${bindingIndex++}, 
      pocket_updated_at = $${bindingIndex++}, pocket_sync_at = $${bindingIndex++}
      WHERE pocket_id = $${bindingIndex++};
      DELETE FROM money WHERE pocket_id = $${bindingIndex};`,
  );
  const bindings = ids.flatMap((id) => [now, now, now, id, id]);
  return DB.execute(`BEGIN TRANSACTION;${queries.join("\n")}COMMIT;`, bindings).pipe(Effect.asVoid);
}
