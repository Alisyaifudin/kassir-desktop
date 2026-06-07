import { Effect } from "effect";
import { DB } from "../instance";

export function deleteMoneyById(id: string) {
  const now = Date.now();
  return DB.execute(
    `UPDATE money SET money_updated_at = $1, money_deleted_at = $2, 
    money_sync_at = null WHERE money_id = $3`,
    [now, now, id],
  ).pipe(Effect.asVoid);
}
