import { DB } from "../instance";
import { Effect } from "effect";

export function updatePaidAt(id: string, paidAt: number) {
  const now = Date.now();
  return DB.try((db) =>
    db.execute(
      `UPDATE records SET record_paid_at = $1, record_updated_at = $2, record_sync_at = null
       WHERE record_id = $3`,
      [paidAt, now, id],
    ),
  ).pipe(Effect.asVoid);
}
