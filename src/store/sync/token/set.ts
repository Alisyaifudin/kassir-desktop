import { getStore } from "../../instance";
import { Effect } from "effect";

export function set(token: string) {
  return Effect.gen(function* () {
    const store = yield* getStore();
    yield* store.set("token", token);
  });
}
