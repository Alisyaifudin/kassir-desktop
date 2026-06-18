import { sqlx } from "~/database/sqlx";
import { Effect } from "effect";
import { cache } from "./cache";

export function deleteManyProductsSync(deleted: { id: string; deletedAt: number }[], now: number) {
  return sqlx.product.sync.delete.many(deleted, now).pipe(
    Effect.tap(() => deleted.forEach(({ id }) => cache.delete(id))),
  );
}
