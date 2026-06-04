import { Effect } from "effect";
import { cache } from "./cache";
import { sqlx } from "~/database/sqlx";

export function upsertMany(
  extras: { id: string; name: string; value: number; kind: DB.ValueKind; updatedAt: number }[],
  now: number,
) {
  return sqlx.extra.upsert.many({ extras, now }).pipe(
    Effect.tap(() => {
      extras.forEach(({ id, name, value, kind, updatedAt }) => {
        cache.update(id, { id, name, value, kind, updatedAt, syncAt: now });
      });
    }),
  );
}
