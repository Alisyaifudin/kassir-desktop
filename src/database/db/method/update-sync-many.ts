import { Effect } from "effect";
import { cache } from "./cache";
import { sqlx } from "~/database/sqlx";

export function updateSyncManyMethods(ids: string[], now: number) {
  return sqlx.method.update.sync.many(ids, now).pipe(
    Effect.tap(() => {
      ids.forEach((id) => cache.update(id, (prev) => ({ ...prev, syncAt: now })));
    }),
  );
}
