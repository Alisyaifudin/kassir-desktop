import { Effect } from "effect";
import { cache } from "./cache";
import { sqlx } from "~/database/sqlx";

export function updateSyncOneExtra(
  extra: {
    id: string;
    name: string;
    value: number;
    kind: DB.ValueKind;
    updatedAt: number;
  },
  now: number,
) {
  return sqlx.extra.update.sync.one(extra, now).pipe(
    Effect.tap(() => {
      cache.update(extra.id, { ...extra, syncAt: now });
    }),
  );
}
