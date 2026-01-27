import { getStore } from "../instance";
import { Size } from "./get";
import { Effect } from "effect";

export function set(size: Size) {
  return Effect.gen(function* () {
    const store = yield* getStore();
    yield* store.set("size", size);
  });
}
