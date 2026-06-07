import { Effect } from "effect";
import { cache } from "./cache";
import { sqlx } from "~/database/sqlx";

export function getCustomersUpdatedAt(ids: string[]) {
  const customers = cache.all();
  if (customers !== null) {
    const set = new Set(ids);
    return Effect.succeed(
      new Map(
        customers.flatMap((customer) =>
          set.has(customer.id) ? [[customer.id, customer.updatedAt]] : [],
        ),
      ),
    );
  }
  return sqlx.customer.get
    .updatedAt(ids)
    .pipe(Effect.map((res) => new Map(res.map((r) => [r.id, r.updatedAt]))));
}
