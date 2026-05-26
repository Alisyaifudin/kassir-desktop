import { getStore } from "../instance";
import { Effect } from "effect";

export function setShowCashier(show: boolean) {
  return Effect.gen(function* () {
    const store = yield* getStore();
    yield* store.set("show-cashier", String(show));
  });
}
