import { DB } from "../instance";
import { Effect } from "effect";

export function deleteManyMethodsSync(ids: string[], now: number) {
  if (ids.length === 0) return Effect.void;
  let bindingIndex = 1;
  const queries = ids.map(
    () =>
      `UPDATE methods SET method_deleted_at = $${bindingIndex++}, 
      method_updated_at = $${bindingIndex++}, method_sync_at = $${bindingIndex++}
      WHERE method_id = $${bindingIndex++};`,
  );
  const bindings = ids.flatMap((id) => [now, now, now, id]);
  return DB.execute(`BEGIN TRANSACTION;${queries.join("\n")}COMMIT;`, bindings).pipe(Effect.asVoid);
}
