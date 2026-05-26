import { Effect } from "effect";
import { db } from "~/database";
import { server } from "~/server";
import { store } from "~/store";

export function pull(token: string) {
  return Effect.gen(function* () {
    const products = yield* db.product.get.all();
    const ids = products.map((p) => p.id);
    const timestamp = yield* store.sync.productEvent.get();
    const [{ data: totalRes }, { data: events }] = yield* Effect.all(
      [server.productEvent.count(timestamp, token), server.productEvent.get(ids, token, timestamp)],
      { concurrency: "unbounded" },
    );
    return { items: events, total: totalRes.count };
  });
}
