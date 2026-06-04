import { Effect } from "effect";
import { cache } from "./cache";
import { sqlx } from "~/database/sqlx";

export function getAllExtras() {
  const extras = cache.all();
  if (extras) {
    return Effect.succeed(extras);
  }
  return sqlx.extra.get.all().pipe(Effect.tap((items) => cache.set(items)));
}
