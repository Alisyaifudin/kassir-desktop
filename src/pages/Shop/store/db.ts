import { createAtom } from "@xstate/store";
import { useAtom } from "@xstate/store/react";
import { Product } from "~/database/product/cache";


export const dbProductsStore = createAtom<Product[]>([]);

export function useDBProducts() {
  return useAtom(dbProductsStore);
}

