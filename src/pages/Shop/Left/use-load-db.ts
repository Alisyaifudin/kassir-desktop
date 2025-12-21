import { createAtom } from "@xstate/store";
import { Extra } from "~/database/extra/caches";
import { Product } from "~/database/product/caches";
import { DBItems } from "../loader/get-db-items";
import { useEffect } from "react";

export const productsDB = createAtom<Product[]>([]);
export const extrasDB = createAtom<Extra[]>([]);
export const dbLoaded = createAtom<{ loading: boolean; error?: string }>({
  loading: true,
  error: undefined,
});

export function useLoadDB(product: Promise<DBItems>) {
  useEffect(() => {
    product
      .then(([errMsg, res]) => {
        if (errMsg !== null) {
          dbLoaded.set({ loading: false, error: errMsg });
        } else {
          dbLoaded.set({ loading: false, error: undefined });
          productsDB.set(res.products);
          extrasDB.set(res.extras);
        }
      })
      .finally(() => {
        dbLoaded.set({ loading: false });
      });
  }, [product]);
}
