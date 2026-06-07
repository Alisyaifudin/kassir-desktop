import { Effect } from "effect";
import { cache } from "./cache";
import { sqlx } from "~/database/sqlx";

export function deleteManyCustomersSync(ids: string[], now: number) {
  return sqlx.customer.sync.delete
    .many(ids, now)
    .pipe(Effect.tap(() => ids.forEach((id) => cache.delete(id))));
}
