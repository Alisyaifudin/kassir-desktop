import { Effect } from "effect";
import { cache } from "./cache";
import { sqlx } from "~/database/sqlx";

export function updateUnsyncAllSocials() {
  return sqlx.social.update.unsync().pipe(Effect.tap(() => cache.revalidate()));
}
