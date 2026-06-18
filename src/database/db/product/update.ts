import { sqlx } from "~/database/sqlx";
import { Effect } from "effect";
import { cache } from "./cache";

export function updateProduct(
  { id, name, price, note }: { id: string; name: string; price: number; note: string },
  now: number,
) {
  return sqlx.product.update.one({ id, name, price, note }, now).pipe(
    Effect.tap(() => {
      cache.update(id, (prev) => ({ ...prev, name, price, note }));
    }),
  );
}
