import { sqlx } from "~/database/sqlx";
import { Effect } from "effect";
import { cache } from "./cache";

export function updateUnsyncAllCustomers() {
  return sqlx.customer.update.allUnsync().pipe(Effect.tap(() => cache.revalidate()));
}
