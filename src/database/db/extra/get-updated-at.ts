import { Effect } from "effect";
import { cache } from "./cache";
import { sqlx } from "~/database/sqlx";

export function getExtrasUpdatedAt(ids: string[]) {
  const extras = cache.all();
  if (extras !== null) {
    const set = new Set(ids);
    return Effect.succeed(
      new Map(
        extras.flatMap((extra) =>
          set.has(extra.id) ? [[extra.id, extra.updatedAt]] : [],
        ),
      ),
    );
  }
  return sqlx.extra.get
    .updatedAt(ids)
    .pipe(Effect.map((res) => new Map(res.map((r) => [r.id, r.updatedAt]))));
}
