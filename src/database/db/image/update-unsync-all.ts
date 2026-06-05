import { sqlx } from "~/database/sqlx";
import { revalidateCache } from "./cache";
import { Effect } from "effect";

export function updateUnsyncAllImages() {
  return sqlx.image.update.unsync().pipe(Effect.tap(() => revalidateCache()));
}
