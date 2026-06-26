import { DB } from "../instance";
import { Effect } from "effect";

export function getAllCustomers() {
  return DB.select<DBNamespace.Customer[]>(
    "SELECT * FROM customers WHERE customer_deleted_at IS NULL",
  ).pipe(
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
