import { sqlx } from "~/database/sqlx";
import { cache } from "./cache";
import { Effect } from "effect";

export function getUnsyncExtrasAfter(timestamp: number) {
  const extras = cache.all();
  if (extras) {
    return Effect.succeed(
      extras.filter((extra) => extra.syncAt === undefined && extra.updatedAt > timestamp),
    );
  }
  return sqlx.extra.get.unsync.after(timestamp);
}
