import { Effect } from "effect";
import { getStore } from "../instance";

export function setName(name: string) {
  return Effect.gen(function* () {
    const store = yield* getStore();
    yield* store.set("printer_name", name);
  });
}
