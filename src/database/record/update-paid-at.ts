import { DB } from "../instance";
import { Effect } from "effect";

export function updatePaidAt(timestamp: number, paidAt: number) {
  return DB.try((db) =>
    db.execute("UPDATE records SET record_paid_at = $1 WHERE timestamp = $2", [paidAt, timestamp]),
  ).pipe(Effect.asVoid);
}
