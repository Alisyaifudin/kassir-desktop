import { createAtom } from "@xstate/store";
import { useAtom } from "@xstate/store/react";
import { Extra } from "~/database/extra/cache";
import { Product } from "~/database/product/cache";

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
