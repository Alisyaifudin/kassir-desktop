import { sqlx } from "~/database/sqlx";
import { Effect } from "effect";
import { cache } from "./cache";

export function updateUnsyncAllImages() {
  return sqlx.extra.update.unsync().pipe(Effect.tap(() => cache.revalidate()));
}
