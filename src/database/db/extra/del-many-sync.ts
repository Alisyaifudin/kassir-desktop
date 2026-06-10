import { Effect } from "effect";
import { cache } from "./cache";
import { sqlx } from "~/database/sqlx";

export function deleteManyExtrasSync(extras: { id: string; deletedAt: number }[], now: number) {
  return sqlx.extra.sync.delete
    .many(extras, now)
    .pipe(Effect.tap(() => extras.forEach(({ id }) => cache.delete(id))));
}
