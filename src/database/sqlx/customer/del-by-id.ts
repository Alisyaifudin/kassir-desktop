import { Effect } from "effect";
import { DB } from "../instance";
import { generateId } from "~/lib/random";

export function deleteCustomerById(id: string) {
  const graveId = generateId();
  const now = Date.now();
  return DB.select<DB.Customer[]>(
    `BEGIN;
       DELETE FROM customers WHERE customer_id = $1;
       INSERT INTO graves (grave_item_id, grave_id, grave_kind, grave_timestamp)
       VALUES ($1, $2, 'customer', $3);
       COMMIT;
      `,
    [id, graveId, now],
  ).pipe(Effect.asVoid);
}
