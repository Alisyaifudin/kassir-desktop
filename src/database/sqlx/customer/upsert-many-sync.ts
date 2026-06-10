import { DB } from "../instance";
import { Effect } from "effect";

/**
 * 
 * @param customers 
 * @param now 
 * @returns inserted ids
 */
export function upsertManyCustomersSync(
  customers: {
    id: string;
    name: string;
    phone: string;
    updatedAt: number;
  }[],
  now: number,
) {
  let bindingIndex = 1;
  const placeholders = customers
    .map(
      () =>
        `($${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++}, 
        $${bindingIndex++}, $${bindingIndex++}, $${bindingIndex++})`,
    )
    .join(", ");
  const bindings = customers.flatMap(({ id, name, phone, updatedAt }) => [
    id,
    name,
    phone,
    updatedAt,
    now,
    null,
  ]);
  return DB.execute(
    `INSERT INTO customers (customer_id, customer_name, customer_phone,
    customer_updated_at, customer_sync_at, customer_deleted_at)
    VALUES ${placeholders} ON CONFLICT (customer_id) DO UPDATE SET 
    customer_name = excluded.customer_name,
    customer_phone = excluded.customer_phone,
    customer_updated_at = excluded.customer_updated_at,
    customer_sync_at = excluded.customer_sync_at,
    customer_deleted_at = excluded.customer_deleted_at
    `,
    bindings,
  ).pipe(Effect.as(customers.map((extra) => extra.id)));
}
