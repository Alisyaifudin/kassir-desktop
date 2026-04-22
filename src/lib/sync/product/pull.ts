import { Effect } from "effect";
import { server } from "~/server";
import { store } from "~/store";

export function pull(token: string) {
  return Effect.gen(function* () {
    const timestamp = yield* store.sync.product.get();
    const { data: products } = yield* server.product.get(timestamp, token);
    return products;
  });
}
