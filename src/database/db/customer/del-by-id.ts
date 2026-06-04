import { Effect } from "effect";
import { cache } from "./cache";
import { sqlx } from "~/database/sqlx";

export function delById(id: string) {
  return sqlx.customer.delete.byId(id).pipe(
    Effect.tap(() => {
      cache.delete(id);
    }),
  );
}
