import { z } from "zod";
import { getStore } from "../instance";
import { Effect } from "effect";

const pullKey = "product-event-last-pull-at";
const pushKey = "product-event-last-push-at";

function numberFromStore(k: string) {
  return Effect.gen(function* () {
    const store = yield* getStore();
    const res = yield* store.get(k);
    return z.number().int().default(0).parse(res);
  });
}

function setNumber(k: string, value: number) {
  return Effect.gen(function* () {
    const store = yield* getStore();
    yield* store.set(k, value);
  });
}

export const productEvent = {
  // Legacy — used by resync and old sync code
  get: () => numberFromStore(pullKey),
  set: (v: number) => setNumber(pullKey, v),

  pullAt: {
    get: () => numberFromStore(pullKey),
    set: (v: number) => setNumber(pullKey, v),
  },
  pushAt: {
    get: () => numberFromStore(pushKey),
    set: (v: number) => setNumber(pushKey, v),
  },
};
