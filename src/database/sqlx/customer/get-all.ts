import { DB } from "../instance";
import { Effect } from "effect";

export function getAllCustomers() {
  return DB.select<DB.Customer[]>("SELECT * FROM customers").pipe(
    Effect.map((res) =>
      res.map((r) => ({
        name: r.customer_name,
        phone: r.customer_phone,
        id: r.customer_id,
        updatedAt: r.customer_updated_at,
        syncAt: r.customer_sync_at ?? undefined,
      })),
    ),
  );
}
