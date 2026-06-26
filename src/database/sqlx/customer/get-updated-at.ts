import { DB } from "../instance";
import { Effect } from "effect";

export function getCustomersUpdatedAt(ids: string[]) {
  const placeholders = ids.map(() => `$`).join(", ");
  return DB.select<Pick<DBNamespace.Customer, "customer_updated_at" | "customer_id">[]>(
    `SELECT customer_updated_at, customer_id FROM customers 
    WHERE customer_deleted_at IS NULL AND customer_id IN (${placeholders})`,
  ).pipe(
    Effect.map((res) =>
      res.map((r) => ({
        id: r.customer_id,
        updatedAt: r.customer_updated_at,
      })),
    ),
  );
}
