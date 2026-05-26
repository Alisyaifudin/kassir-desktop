import { Effect } from "effect";
import { server } from "~/server";
import { store } from "~/store";

export function pull(token: string) {
  return Effect.gen(function* () {
    const timestamp = yield* store.sync.method.get();
    const { data } = yield* server.method.get(timestamp, token);
    return data;
  });
}
