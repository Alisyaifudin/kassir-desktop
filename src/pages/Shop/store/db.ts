import { createAtom } from "@xstate/store";
import { useAtom } from "@xstate/store/react";
import { Extra } from "~/database-effect/extra/caches";
import { Product } from "~/database-effect/product/caches";

export const dbItemsStore = createAtom({
  products: [] as Product[],
  extras: [] as Extra[],
});

export function useDBProducts() {
  return useAtom(dbItemsStore, (state) => state.products);
}

export function useDBExtras() {
  return useAtom(dbItemsStore, (state) => state.extras);
}
