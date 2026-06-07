import { Effect } from "effect";
import { cache } from "./cache";
import { sqlx } from "~/database/sqlx";

export function upsertManyCustomersSync(
  customers: { id: string; name: string; phone: string; updatedAt: number }[],
  now: number,
) {
  return sqlx.customer.sync.upsert.many(customers, now).pipe(
    Effect.tap(() => {
      customers.forEach(({ id, name, phone, updatedAt }) => {
        cache.update(id, { id, name, phone, updatedAt, syncAt: now });
      });
    }),
  );
}
