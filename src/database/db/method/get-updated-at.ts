import { Effect } from "effect";
import { cache } from "./cache";
import { sqlx } from "~/database/sqlx";

export function getMethodsUpdatedAt(ids: string[]) {
  const methods = cache.all();
  if (methods !== null) {
    const set = new Set(ids);
    return Effect.succeed(
      new Map(
        methods.flatMap((method) =>
          set.has(method.id) ? [[method.id, method.updatedAt]] : [],
        ),
      ),
    );
  }
  return sqlx.method.get
    .updatedAt(ids)
    .pipe(Effect.map((res) => new Map(res.map((r) => [r.id, r.updatedAt]))));
}
