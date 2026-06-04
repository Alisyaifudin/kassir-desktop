import { Effect } from "effect";
import { Extra, cache } from "./cache";
import { sqlx } from "~/database/sqlx";

export function update({ id, kind, name, value }: Extra) {
  const now = Date.now();
  return sqlx.extra.update.one(id, name, value, kind, now).pipe(
    Effect.tap(() => {
      cache.update(id, { id, kind, name, value, updatedAt: now, syncAt: undefined });
    }),
  );
}
