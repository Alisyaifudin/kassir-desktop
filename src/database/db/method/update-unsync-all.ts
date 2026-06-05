import { Effect } from "effect";
import { cache } from "./cache";
import { sqlx } from "~/database/sqlx";

export function updateUnsyncAll() {
  return sqlx.method.update.unsync().pipe(Effect.tap(() => cache.revalidate()));
}
