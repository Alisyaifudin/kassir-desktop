import { Effect } from "effect";
import { db } from "~/database";
import { Result } from "~/lib/result";
import { setLength } from "../pages/Stock/Product/use-length";
import { Product } from "~/database/product/caches";
import { useSyncExternalStore } from "react";

const KEY = "products";

let cache: Product[] | null = null;

export function loadProducts() {
  if (cache === null) {
    return db.product.get.all().pipe(
      Effect.tap((r) => {
        cache = r;
        notify();
      }),
    );
  }
  return Effect.succeed(cache);
}

function getSnapshot() {
  return cache;
}
type Listener = () => void;
const listeners = new Set<Listener>();
function subscribe(cb: Listener) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function notify() {
  listeners.forEach((l) => l());
}

export function useProducts() {
  const products = useSyncExternalStore(subscribe, getSnapshot);
  return products ?? [];
}

export function useGetProducts() {
  const res = Result.use({
    fn: () =>
      loadProducts().pipe(
        Effect.tap((r) => {
          setLength(r.length);
          return r;
        }),
      ),
    key: KEY,
    revalidateOn: {
      unmount: true,
    },
  });
  return res;
}

export function revalidateProducts() {
  Result.revalidate(KEY);
  cache = null;
  notify();
}
