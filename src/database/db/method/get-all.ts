import { Effect } from "effect";
import { cache } from "./cache";
import { sqlx } from "~/database/sqlx";

export function getAllMethods() {
  const methods = cache.all();
  if (methods !== null) return Effect.succeed(methods);
  return sqlx.method.get.all().pipe(Effect.tap((items) => cache.set(items)));
}
