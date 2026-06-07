import { DB } from "../instance";
import { Effect } from "effect";

export function updateMoneyNote(id: string, note: string, now: number) {
  return DB.execute(
    `UPDATE money SET money_note = $1, money_updated_at = $2, 
    money_unsync_at = null WHERE money_id = $3`,
    [note, now, id],
  ).pipe(Effect.asVoid);
}
