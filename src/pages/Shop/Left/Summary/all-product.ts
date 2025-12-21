import { createAtom } from "@xstate/store";
import { Product } from "~/database/product/caches";

export const allAtom = createAtom<Product[] | null>(null);
