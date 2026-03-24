import { DB } from "../instance";
import { Effect } from "effect";
import { cache } from "./cache";

export function getAllUnsync() {
  const customers = cache.all();
  if (customers !== null) {
    return Effect.succeed(customers.filter((c) => c.syncAt === null));
  }
  return DB.try((db) =>
    db.select<DB.Customer[]>("SELECT * FROM customers WHERE customer_sync_at IS NULL"),
  ).pipe(
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
