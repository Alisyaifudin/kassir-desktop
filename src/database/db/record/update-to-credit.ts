import { Effect } from "effect";
import { DB } from "../instance";

export function updateToCredit(id: string) {
  const now = Date.now();
  return DB.try((db) =>
    db.execute(
      `UPDATE records SET record_is_credit = 1, record_pay = 0, record_rounding = 0,
       record_updated_at = $1, record_sync_at = null WHERE record_id = $2`,
      [now, id],
    ),
  ).pipe(Effect.asVoid);
}
