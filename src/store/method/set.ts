import { getStore } from "../instance";
import { Effect } from "effect";

export function set(key: "transfer" | "debit" | "qris", val?: string) {
  return Effect.gen(function* () {
    const store = yield* getStore();
    if (val === undefined) {
      yield* store.delete(`default-${key}`);
    } else {
      yield* store.set(`default-${key}`, val);
    }
  });
}
