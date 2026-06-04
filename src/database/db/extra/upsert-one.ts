import { Effect } from "effect";
import { cache } from "./cache";
import { sqlx } from "~/database/sqlx";

export function upsert({
  name,
  value,
  kind,
  id,
  updatedAt,
  now,
}: {
  name: string;
  value: number;
  kind: DB.ValueKind;
  id: string;
  updatedAt: number;
  now: number;
}) {
  return sqlx.extra.upsert.one({ id, name, value, kind, updatedAt, now }).pipe(
    Effect.tap(() => {
      cache.update(id, { id, name, value, kind, updatedAt, syncAt: now });
    }),
  );
}
