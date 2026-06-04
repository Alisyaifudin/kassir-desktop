import { Effect } from "effect";
import { DB } from "../instance";

export function deleteCustomerById(id: string, now: number) {
  return DB.execute(
    `UPDATE customers SET customer_deleted_at = $1, customer_updated_at = $2, 
    customer_sync_at = null
    WHERE customer_id = $3`,
    [now, now, id],
  ).pipe(Effect.asVoid);
}
