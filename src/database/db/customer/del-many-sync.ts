import { Effect } from "effect";
import { cache } from "./cache";
import { sqlx } from "~/database/sqlx";

export function deleteManyCustomersSync(
  deleted: {
    id: string;
    deletedAt: number;
  }[],
  now: number,
) {
  return sqlx.customer.sync.delete
    .many(deleted, now)
    .pipe(Effect.tap(() => deleted.forEach((item) => cache.delete(item.id))));
}
