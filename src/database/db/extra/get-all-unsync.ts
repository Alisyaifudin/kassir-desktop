import { Effect } from "effect";
import { cache } from "./cache";
import { sqlx } from "~/database/sqlx";

export function getAllExtrasUnsync() {
  const extras = cache.all();
  if (extras) {
    return Effect.succeed(extras.filter((e) => e.syncAt === undefined));
  }
  return sqlx.extra.get.unsync();
}
