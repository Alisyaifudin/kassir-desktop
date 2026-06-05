import { Effect } from "effect";
import { DB } from "../instance";

export function updateSyncManyMethods(ids: string[], now: number) {
  if (ids.length === 0) return Effect.void;
  let bindingIndex = 1;
  const queries = ids.map(
    () =>
      `UPDATE methods SET method_sync_at = $${bindingIndex++} WHERE method_id = $${bindingIndex++};`,
  );
  const bindings = ids.flatMap((id) => [now, id]);
  return DB.execute(`BEGIN TRANSACTION;${queries.join("\n")}COMMIT;`, bindings).pipe(Effect.asVoid);
}
