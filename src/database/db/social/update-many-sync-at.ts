import { Effect } from "effect";
import { sqlx } from "~/database/sqlx";
import { cache } from "./cache";

export function updateManySocialsSyncAt(ids: string[], now: number) {
  return sqlx.social.sync.update.many.syncAt(ids, now).pipe(
    Effect.tap(() => {
      ids.forEach((id) => cache.update(id, (prev) => ({ ...prev, syncAt: now })));
    }),
  );
}
