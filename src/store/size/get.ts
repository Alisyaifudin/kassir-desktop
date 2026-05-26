import { getStore } from "../instance";
import { Effect } from "effect";

export type Size = "big" | "small";

export function get() {
  return Effect.gen(function* () {
    const store = yield* getStore();
    const res = yield* store.get("size");
    const size = parseSize(res);
    return size;
  });
}

function parseSize(size: unknown): Size {
  if (size === "big" || size === "small") {
    return size;
  }
  return "big";
}
