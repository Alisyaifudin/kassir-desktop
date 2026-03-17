import { Effect } from "effect";
import { getStore } from "../instance";

export function setWidth(width: number) {
  return Effect.gen(function* () {
    const store = yield* getStore();
    yield* store.set("printer_width", width);
  });
}
