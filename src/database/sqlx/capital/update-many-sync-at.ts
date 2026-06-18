import { DB } from "../instance";
import { Effect } from "effect";

export function updateManyCapitalsSyncAt(ids: string[], now: number) {
  if (ids.length === 0) return Effect.void;
  let bindingIndex = 1;
  const queries = ids.map(
    () =>
      `UPDATE capitals SET capital_sync_at = $${bindingIndex++} WHERE capital_id = $${bindingIndex++};`,
  );
  const bindings = ids.flatMap((id) => [now, id]);
  return DB.execute(`BEGIN TRANSACTION;${queries.join("\n")}COMMIT;`, bindings).pipe(Effect.asVoid);
}
