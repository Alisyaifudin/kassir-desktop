import { Effect } from "effect";
import { cache } from "./cache";
import { sqlx } from "~/database/sqlx";

export function deleteManyExtrasSync(ids: string[], now: number) {
  return sqlx.extra.delete
    .sync(ids, now)
    .pipe(Effect.tap(() => ids.forEach((id) => cache.delete(id))));
}
