import { Effect } from "effect";
import { DB } from "../instance";

export function updatePayCredit({
  id,
  pay,
  rounding,
}: {
  id: string;
  pay: number;
  rounding: number;
}) {
  const now = Date.now();
  return DB.try((db) =>
    db.execute(
      `UPDATE records SET record_is_credit = 0, record_pay = $1, record_rounding = $2, record_paid_at = $3
       record_updated_at = $3, record_sync_at = null WHERE record_id = $4`,
      [pay, rounding, now, id],
    ),
  ).pipe(Effect.asVoid);
}
