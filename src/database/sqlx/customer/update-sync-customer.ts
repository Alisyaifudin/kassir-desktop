import { Effect } from "effect";
import { DB } from "../instance";

export function updateSyncCustomer(id: string) {
  const now = Date.now();
  return DB.execute("UPDATE customers SET customer_sync_at = $1 WHERE customer_id = $2", [
    now,
    id,
  ]).pipe(Effect.asVoid);
}
