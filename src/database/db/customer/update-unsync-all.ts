import { sqlx } from "~/database/sqlx";
import { Effect } from "effect";
import { cache } from "./cache";

export function updateUnsyncAllCustomers() {
  return sqlx.customer.update.unsyncAll().pipe(Effect.tap(() => cache.revalidate()));
}
