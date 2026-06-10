import { DB } from "../instance";
import { Effect } from "effect";

export function deleteManyExtrasSync(extras: { id: string; deletedAt: number }[], now: number) {
  if (extras.length === 0) return Effect.void;
  let bindingIndex = 1;
  const queries = extras.map(
    () =>
      `UPDATE extras SET extra_deleted_at = $${bindingIndex++}, 
      extra_updated_at = $${bindingIndex++}, extra_sync_at = $${bindingIndex++}
      WHERE extra_id = $${bindingIndex++};`,
  );
  const bindings = extras.flatMap(({ id, deletedAt }) => [deletedAt, deletedAt, now, id]);
  return DB.execute(`BEGIN TRANSACTION;${queries.join("\n")}COMMIT;`, bindings).pipe(Effect.asVoid);
}
