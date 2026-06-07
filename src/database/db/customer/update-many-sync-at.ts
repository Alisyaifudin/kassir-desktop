import { Effect } from "effect";
import { sqlx } from "~/database/sqlx";
import { cache } from "./cache";

export function updateManyCustomersSyncAt(ids: string[], now: number) {
  return sqlx.customer.sync.update.many.syncAt(ids, now).pipe(
    Effect.tap(() => {
      ids.forEach((id) => cache.update(id, (prev) => ({ ...prev, syncAt: now })));
    }),
  );
}
