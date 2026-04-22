import { Effect } from "effect";
import { server } from "~/server";

export function pull(productId: string, token: string) {
  return Effect.gen(function* () {
    const { data } = yield* server.productEvent.get(productId, token);
    return data;
  });
}
