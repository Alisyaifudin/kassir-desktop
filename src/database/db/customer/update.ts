import { Effect } from "effect";
import { cache } from "./cache";
import { sqlx } from "~/database/sqlx";

export function updateCustomer({ id, name, phone }: { id: string; name: string; phone: string }) {
  const now = Date.now();
  return sqlx.customer.update.one({ id, name, phone, now }).pipe(
    Effect.tap(() => {
      cache.update(id, {
        id,
        name,
        phone,
        updatedAt: now,
      });
    }),
  );
}
