import { Effect } from "effect";
import { db } from "~/database";
import { Result } from "~/lib/result";
import { dbProductsStore } from "~/pages/Shop/store/db";

export function loadProducts() {
  return db.product.get.all().pipe(
    Effect.tap((r) => {
      dbProductsStore.set(r);
    }),
  );
}


const KEY = "products-shop";

export function useFetchProducts() {
  const res = Result.use({
    fn: () => loadProducts(),
    key: KEY,
  });
  return res;
}
