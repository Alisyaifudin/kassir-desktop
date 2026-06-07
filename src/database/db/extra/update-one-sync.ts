import { Effect } from "effect";
import { cache } from "./cache";
import { sqlx } from "~/database/sqlx";

export function updateOneExtraSync(
  extra: {
    id: string;
    name: string;
    value: number;
    kind: DB.ValueKind;
    updatedAt: number;
  },
  now: number,
) {
  return sqlx.extra.sync.update.one(extra, now).pipe(
    Effect.tap(() => {
      cache.update(extra.id, { ...extra, syncAt: now });
    }),
  );
}
