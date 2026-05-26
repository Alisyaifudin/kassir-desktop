import { Effect } from "effect";
import { db } from "~/database";
import { log } from "~/lib/log";
import { server } from "~/server";

export function push(token: string) {
  return Effect.gen(function* () {
    const entries = yield* db.grave.get.all();
    if (entries.length === 0) return 0;
    const products = entries.filter((e) => e.kind === "product").map((e) => e.itemId);
    const records = entries.filter((e) => e.kind === "record").map((e) => e.itemId);
    const { data } = yield* server.grave.delete({ products, records }, token);
    const failedSet = new Set([...data.products, ...data.records]);
    const succeeded = entries.filter((e) => !failedSet.has(e.itemId));
    if (succeeded.length > 0) {
      yield* db.grave.del.byIds(succeeded.map((e) => e.id)).pipe(
        Effect.tapError((e) => {
          log.error(`Grave push del error: ${e.e.message}`);
          return Effect.fail(e);
        }),
      );
    }
    return entries.length;
  });
}
