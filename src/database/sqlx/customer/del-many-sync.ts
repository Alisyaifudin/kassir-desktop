import { DB } from "../instance";
import { Effect } from "effect";

export function deleteManyCustomersSync(ids: string[], now: number) {
  if (ids.length === 0) return Effect.void;
  let bindingIndex = 1;
  const queries = ids.map(
    () =>
      `UPDATE customers SET customer_deleted_at = $${bindingIndex++}, 
      customer_updated_at = $${bindingIndex++}, customer_sync_at = $${bindingIndex++}
      WHERE customer_id = $${bindingIndex++};`,
  );
  const bindings = ids.flatMap((id) => [now, now, now, id]);
  return DB.execute(`BEGIN TRANSACTION;${queries.join("\n")}COMMIT;`, bindings).pipe(Effect.asVoid);
}
