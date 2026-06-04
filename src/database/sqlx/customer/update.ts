import { DB } from "../instance";
import { Effect } from "effect";

export function updateCustomer({ id, name, phone }: { id: string; name: string; phone: string }) {
  const now = Date.now();
  return DB.execute(
    `UPDATE customers SET customer_name = $1, customer_phone = $2, 
       customer_sync_at = null, customer_updated_at = $3
       WHERE customer_id = $4`,
    [name, phone, now, id],
  ).pipe(Effect.asVoid);
}
