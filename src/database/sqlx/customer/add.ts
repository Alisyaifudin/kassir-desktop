import { generateId } from "~/lib/random";
import { DB } from "../instance";
import { Effect } from "effect";

export function addNewCustomer(name: string, phone: string, now: number) {
  const id = generateId();
  return DB.execute(
    `INSERT INTO customers (customer_id, customer_name, customer_phone, customer_updated_at, customer_sync_at) 
       VALUES ($1, $2, $3, $4, null)`,
    [id, name, phone, now],
  ).pipe(Effect.as(id));
}
