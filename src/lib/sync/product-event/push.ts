import { Effect } from "effect";
import { db } from "~/database";
import { log } from "~/lib/log";
import { server } from "~/server";

export function push(token: string, upto: number) {
  return Effect.gen(function* () {
    const events = yield* db.productEvent.get.unsync(upto);
    console.log(upto, events.slice(0, 5));
    if (events.length === 0) return 0;
    const { data } = yield* server.productEvent.post(events, token);
    const { timestamp, failedIds } = data;
    const failedSet = new Set(failedIds);
    const syncIds = events.flatMap((p) => (failedSet.has(p.id) ? [] : [p.id]));
    if (syncIds.length > 0) {
      yield* Effect.all(
        syncIds.map((id) =>
          db.productEvent.update.syncAt(id, timestamp).pipe(
            Effect.tapError((e) => {
              log.error(`Error: ${id}: ${e.e.message}`);
              return Effect.fail(e);
            }),
          ),
        ),
        { concurrency: 50 },
      );
    }
    const unsyncCount = yield* db.productEvent.get.countUnsync();
    return unsyncCount;
  });
}
