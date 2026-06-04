import { DB } from "../instance";
import { Effect } from "effect";

export function getAllCustomersUnsync() {
  return DB.select<DB.Customer[]>("SELECT * FROM customers WHERE customer_sync_at IS NULL").pipe(
    Effect.map((res) =>
      res.map((r) => ({
        name: r.customer_name,
        phone: r.customer_phone,
        id: r.customer_id,
        updatedAt: r.customer_updated_at,
      })),
    ),
  );
}
