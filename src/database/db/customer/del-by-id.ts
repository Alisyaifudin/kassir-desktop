import { Effect } from "effect";
import { cache } from "./cache";
import { sqlx } from "~/database/sqlx";

export function deleteCustomerById(id: string) {
  const now = Date.now();
  return sqlx.customer.delete.byId(id, now).pipe(
    Effect.tap(() => {
      cache.delete(id);
    }),
  );
}
