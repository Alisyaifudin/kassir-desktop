import { sqlx } from "~/database/sqlx";
import { cache } from "./cache";
import { Effect } from "effect";

export function getUnsyncMethodsAfter(timestamp: number) {
  const methods = cache.all();
  if (methods !== null) {
    return Effect.succeed(methods.filter(method => method.syncAt === undefined && method.updatedAt > timestamp))
  }
  return sqlx.method.get.unsync.after(timestamp);
}
