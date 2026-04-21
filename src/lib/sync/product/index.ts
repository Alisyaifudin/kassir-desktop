import { Effect } from "effect";
import { pull } from "./pull";
import { merge } from "./merge";
import { push } from "./push";
import { store } from "~/store";

const LIMIT = 1000;

export function sync(redo = false) {
  return Effect.gen(function* () {
    if (redo) {
      yield* store.sync.product.set(0);
    }
    for (let i = 0; i < LIMIT; i++) {
      const products = yield* pull();
      const upto = yield* merge(products);
      const unsyncCount = yield* push(upto);
      // if upto is undefined, meaning all the products from server have been merged
      yield* store.sync.product.set(upto ?? 0);
      if (unsyncCount === 0 && products.length === 0) {
        break;
      }
    }
  });
}
