import { createAtom } from "@xstate/store";
import { useAtom } from "@xstate/store/react";
import { Extra } from "~/database/extra/caches";
import { Product } from "~/database/product/caches";

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
