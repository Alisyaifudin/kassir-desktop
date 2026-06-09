import { DB } from "../instance";
import { Effect } from "effect";

export function deleteManyMethodsSync(deleted: { id: string; deletedAt: number }[], now: number) {
  if (deleted.length === 0) return Effect.void;
  let bindingIndex = 1;
  const queries = deleted.map(
    () =>
      `UPDATE methods SET method_deleted_at = $${bindingIndex++},
      method_updated_at = $${bindingIndex++}, method_sync_at = $${bindingIndex++}
      WHERE method_id = $${bindingIndex++};`,
  );
  const bindings = deleted.flatMap(({ id, deletedAt }) => [deletedAt, deletedAt, now, id]);
  return DB.execute(`BEGIN TRANSACTION;${queries.join("\n")}COMMIT;`, bindings).pipe(Effect.asVoid);
}
