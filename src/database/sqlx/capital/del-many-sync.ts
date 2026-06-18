import { DB } from "../instance";
import { Effect } from "effect";

export function deleteManyCapitalsSync(deleted: { id: string; deletedAt: number }[], now: number) {
  if (deleted.length === 0) return Effect.void;
  let bindingIndex = 1;
  const query = deleted
    .map(
      () =>
        `UPDATE capitals SET capital_deleted_at = $${bindingIndex++},
        capital_updated_at = $${bindingIndex++}, capital_sync_at = $${bindingIndex++}
        WHERE capital_id = $${bindingIndex++};`,
    )
    .join("\n");
  const bindings = deleted.flatMap(({ id, deletedAt }) => [deletedAt, deletedAt, now, id]);
  return DB.execute(`BEGIN TRANSACTION;${query}COMMIT`, bindings).pipe(Effect.asVoid);
}
