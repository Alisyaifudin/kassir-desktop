import { Effect } from "effect";
import { DB } from "../instance";

export function deleteManyMoneySync(ids: string[], now: number) {
  if (ids.length === 0) return Effect.void;
  let bindingIndex = 1;
  const queries = ids.map(
    () =>
      `UPDATE money SET money_deleted_at = $${bindingIndex++}, 
      money_updated_at = $${bindingIndex++}, money_sync_at = $${bindingIndex++}
      WHERE money_id = $${bindingIndex++};`,
  );
  const bindings = ids.flatMap((id) => [now, now, now, id]);
  return DB.execute(`BEGIN TRANSACTION;${queries.join("\n")}COMMIT;`, bindings).pipe(Effect.asVoid);
}
