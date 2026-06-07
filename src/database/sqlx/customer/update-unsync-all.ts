import { DB } from "../instance";
import { Effect } from "effect";

export function updateUnsyncAllCustomers() {
  return DB.execute("UPDATE customers SET customer_sync_at = null").pipe(Effect.asVoid);
}
