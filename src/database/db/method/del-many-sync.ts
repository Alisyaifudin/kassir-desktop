import { Effect } from "effect";
import { cache } from "./cache";
import { sqlx } from "~/database/sqlx";

export function deleteManyMethodsSync(ids: string[], now: number) {
  return sqlx.method.sync.delete
    .many(ids, now)
    .pipe(Effect.tap(() => ids.forEach((id) => cache.delete(id))));
}
