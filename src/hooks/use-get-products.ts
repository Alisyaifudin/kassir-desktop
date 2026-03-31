import { Effect, pipe } from "effect";
import { db } from "~/database";
import { Result } from "~/lib/result";
import { setLength } from "../pages/Stock/Product/use-length";
import { createAtom } from "@xstate/store";
import { Product } from "~/database/product/cache";
import { useAtom } from "@xstate/store/react";

const productsAtom = createAtom<Product[]>([]);

export function loadProducts() {
  return db.product.get.all().pipe(
    Effect.tap((r) => {
      productsAtom.set(r);
    }),
  );
}

// function getSnapshot() {
//   return cache;
// }
// type Listener = () => void;
// const listeners = new Set<Listener>();
// function subscribe(cb: Listener) {
//   listeners.add(cb);
//   return () => {
//     listeners.delete(cb);
//   };
// }

// function notify() {
//   listeners.forEach((l) => l());
// }

export function useProducts() {
  return useAtom(productsAtom);
}

const program = pipe(
  loadProducts(),
  Effect.tap((r) => {
    setLength(r.length);
  }),
);

const KEY = "products";

export function useGetProducts() {
  const res = Result.use({
    fn: () => program,
    key: KEY,
  });
  return res;
}

export function revalidateProducts() {
  Result.revalidate(KEY);
}
