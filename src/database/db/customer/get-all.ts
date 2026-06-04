import { Effect } from "effect";
import { cache } from "./cache";
import { sqlx } from "~/database/sqlx";

export function getAll() {
  const customers = cache.all();
  if (customers !== null) {
    return Effect.succeed(customers);
  }
  return sqlx.customer.get.all().pipe(
    Effect.tap((customers) => {
      cache.set(customers);
    }),
  );
}
