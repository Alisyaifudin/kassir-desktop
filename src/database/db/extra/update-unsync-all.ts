import { sqlx } from "~/database/sqlx";
import { Effect } from "effect";
import { cache } from "./cache";

export function updateUnsyncAllExtras() {
  return sqlx.extra.update.unsyncAll().pipe(Effect.tap(() => cache.revalidate()));
}
