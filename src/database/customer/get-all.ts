import { DB } from "../instance";
import { Effect } from "effect";
import { type Customer, cache } from "./cache";

export function getAll() {
  const customers = cache.all();
  if (customers !== null) {
    return Effect.succeed(customers);
  }
  return DB.try((db) => db.select<DB.Customer[]>("SELECT * FROM customers")).pipe(
    Effect.map((res) => {
      const customers = res.map((r) => ({
        name: r.customer_name,
        phone: r.customer_phone,
        id: r.customer_id,
        updatedAt: r.customer_updated_at,
        syncAt: r.customer_sync_at,
      }));
      cache.set(customers);
      return customers as Customer[];
    }),
  );
}
