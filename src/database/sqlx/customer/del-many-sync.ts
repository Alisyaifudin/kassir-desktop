import { DB } from "../instance";
import { Effect } from "effect";

export function deleteManyCustomersSync(deleted: { id: string; deletedAt: number }[], now: number) {
  if (deleted.length === 0) return Effect.void;
  let bindingIndex = 1;
  const queries = deleted.map(
    () =>
      `UPDATE customers SET customer_deleted_at = $${bindingIndex++}, 
      customer_updated_at = $${bindingIndex++}, customer_sync_at = $${bindingIndex++}
      WHERE customer_id = $${bindingIndex++};`,
  );
  const bindings = deleted.flatMap(({ id, deletedAt }) => [deletedAt, deletedAt, now, id]);
  return DB.execute(`BEGIN TRANSACTION;${queries.join("\n")}COMMIT;`, bindings).pipe(Effect.asVoid);
}
