import { Effect } from "effect";
import { cache } from "./cache";
import { sqlx } from "~/database/sqlx";

export function addNewCustomer(name: string, phone: string) {
  const now = Date.now();
  return sqlx.customer.add.one(name, phone, now).pipe(
    Effect.tap((id) => {
      cache.update(id, { id, name, phone, updatedAt: now, syncAt: undefined });
    }),
  );
}
