import { Effect } from "effect";
import { db } from "~/database";
import { log } from "~/lib/log";
import { server } from "~/server";

export function push(upto?: number) {
  return Effect.gen(function* () {
    const products = yield* db.product.get.unsync(upto ?? Date.now());
    if (products.length === 0) return 0;
    const { data } = yield* server.product.post(products);
    const { timestamp, failed } = data;
    const failedSet = new Set(failed);
    const syncIds = products.flatMap((p) => (failedSet.has(p.id) ? [p.id] : []));
    if (syncIds.length > 0)
      yield* Effect.all(
        syncIds.map((id) =>
          db.product.update.syncAt(id, timestamp).pipe(
            Effect.tapError((e) => {
              log.error(`Error: ${id}: ${e.e.message}`);
              return Effect.fail(e);
            }),
          ),
        ),
        { concurrency: 10 },
      );
    const unsyncCount = yield* db.product.get.countUnsync();
    return unsyncCount;
  });
}
