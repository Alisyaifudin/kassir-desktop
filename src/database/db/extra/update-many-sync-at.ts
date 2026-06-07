import { Effect } from "effect";
import { cache } from "./cache";
import { sqlx } from "~/database/sqlx";

export function updateManyExtrasSyncAt(ids: string[], now: number) {
  return sqlx.extra.sync.update.many.syncAt(ids, now).pipe(
    Effect.tap(() => {
      ids.forEach((id) => cache.update(id, (prev) => ({ ...prev, syncAt: now })));
    }),
  );
}
