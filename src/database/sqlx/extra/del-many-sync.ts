import { DB } from "../instance";
import { Effect } from "effect";

export function deleteManyExtrasSync(ids: string[], now: number) {
  if (ids.length === 0) return Effect.void;
  let bindingIndex = 1;
  const queries = ids.map(
    () =>
      `UPDATE extras SET extra_deleted_at = $${bindingIndex++}, 
      extra_updated_at = $${bindingIndex++}, extra_sync_at = $${bindingIndex++}
      WHERE extra_id = $${bindingIndex++};`,
  );
  const bindings = ids.flatMap((id) => [now, now, now, id]);
  return DB.execute(`BEGIN TRANSACTION;${queries.join("\n")}COMMIT;`, bindings).pipe(Effect.asVoid);
}
