import { Effect } from "effect";
import { db } from "~/database";
import { server } from "~/server";
import { store } from "~/store";
import { merge } from "./merge";

export function pullBatch(token: string) {
  return Effect.gen(function* () {
    const products = yield* db.product.get.all();
    const ids = products.map((p) => p.id);
    const timestamp = yield* store.sync.productEvent.pullAt.get();
    const [{ data: totalRes }, { data: events }] = yield* Effect.all(
      [server.productEvent.count(timestamp, token), server.productEvent.get(ids, token, timestamp)],
      { concurrency: "unbounded" },
    );
    if (events.length === 0) {
      // No more events — advance timestamp to now so next pull gets 0
      yield* store.sync.productEvent.pullAt.set(Date.now());
      return { server: 0, total: 0 };
    }
    const latest = yield* merge(events);
    yield* store.sync.productEvent.pullAt.set(latest);
    return { server: events.length, total: totalRes.count };
  });
}
