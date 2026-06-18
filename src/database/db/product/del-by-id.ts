import { sqlx } from "~/database/sqlx";
import { Effect } from "effect";
import { cache } from "./cache";

export function deleteProductById(id: string, now: number) {
  return sqlx.product.delete.byId(id, now).pipe(
    Effect.tap(() => cache.delete(id)),
  );
}
