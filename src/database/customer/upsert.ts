import { DB } from "../instance";
import { Effect } from "effect";
import { type CustomerFull, cache } from "./cache";

export function upsert({ id, name, phone, updatedAt }: Omit<CustomerFull, "syncAt">) {
  const now = Date.now();
  return DB.try((db) =>
    db.execute(
      `INSERT INTO customers (customer_id, customer_name, customer_phone, customer_updated_at, customer_sync_at) 
       VALUES ($1, $2, $3, $4, $5) ON CONFLICT (customer_id) DO UPDATE SET
       customer_name = excluded.customer_name,
       customer_phone = excluded.customer_phone,
       customer_updated_at = excluded.customer_updated_at,
       customer_sync_at = excluded.customer_sync_at
       `,
      [id, name, phone, updatedAt, now],
    ),
  ).pipe(
    Effect.tap(() => {
      cache.update(id, {
        id,
        name,
        phone,
        syncAt: now,
        updatedAt,
      });
    }),
    Effect.as(id),
  );
}
