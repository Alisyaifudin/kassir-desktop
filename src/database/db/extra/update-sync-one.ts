import { Effect } from "effect";
import { cache } from "./cache";
import { sqlx } from "~/database/sqlx";

export function updateSyncOneExtra(id: string, now: number) {
  return sqlx.extra.update.sync.one(id, now).pipe(
    Effect.tap(() => {
      cache.update(id, (prev) => ({ ...prev, syncAt: now }));
    }),
  );
}
