import { Effect } from "effect";
import { DB } from "../instance";

export function deleteCapitalById(id: string) {
  const now = Date.now()
  return DB.execute(
    `UPDATE capitals SET capital_deleted_at = $1, capital_updated_at = $2,
    capital_sync_at = null WHERE capital_id = $3`,
    [now, now, id],
  ).pipe(Effect.asVoid);
}
