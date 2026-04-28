import { Effect } from "effect";
import { server } from "~/server";
import { store } from "~/store";

export function pull(token: string) {
  return Effect.gen(function* () {
    const timestamp = yield* store.sync.product.get();
    const [{ data: totalRes }, { data: products }] = yield* Effect.all(
      [server.product.count(timestamp, token), server.product.get(timestamp, token)],
      { concurrency: "unbounded" },
    );
    return { items: products, total: totalRes.count };
  });
}
