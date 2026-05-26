import { z } from "zod";
import { getStore } from "../instance";
import { Effect } from "effect";

const key = "grave-last-pull";

function get() {
  return Effect.gen(function* () {
    const store = yield* getStore();
    const res = yield* store.get(key);
    const val = z.number().int().default(0).parse(res);
    return val;
  });
}

function set(value: number) {
  return Effect.gen(function* () {
    const store = yield* getStore();
    yield* store.set(key, value);
  });
}

export const grave = {
  set,
  get,
};
