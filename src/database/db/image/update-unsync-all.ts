import { sqlx } from "~/database/sqlx";
import { cache } from "./cache";
import { Effect } from "effect";

export function updateUnsyncAllImages() {
  return sqlx.image.update.unsyncAll().pipe(Effect.tap(() => cache.revalidate()));
}
