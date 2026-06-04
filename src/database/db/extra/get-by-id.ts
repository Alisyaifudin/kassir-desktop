import { Effect } from "effect";
import { cache } from "./cache";
import { sqlx } from "~/database/sqlx";

export function getExtraById(id: string) {
  const extra = cache.get(id);
  if (extra !== undefined) {
    return Effect.succeed(extra);
  }
  return sqlx.extra.get.byId(id);
}
