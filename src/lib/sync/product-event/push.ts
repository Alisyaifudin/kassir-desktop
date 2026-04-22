import { Effect } from "effect";
import { db } from "~/database";
import { server } from "~/server";

export function push(productId: string, token: string) {
  return Effect.gen(function* () {
    const events = yield* db.productEvent.get.unsync(productId);
    if (events.length === 0) return 0;
    const { data } = yield* server.productEvent.post(events, token);
    const { timestamp, failed } = data;
    const failedSet = new Set(failed);
    const syncIds = events.flatMap((p) => (failedSet.has(p.id) ? [] : [p.id]));
    if (syncIds.length > 0) {
      yield* db.productEvent.set.syncAt(productId, syncIds, timestamp);
    }
    return yield* db.productEvent.get.countUnsync(productId);
  });
}
