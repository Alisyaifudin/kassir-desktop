import Fuse, { IFuseOptions, FuseResult } from "fuse.js";
import { useMemo } from "react";
import { Product } from "~/database/product/caches";

// Fuse returns the original item nested within the result object
export type FuseProductSearchResult = FuseResult<Product>;

export const useProductSearch = (products: Product[]) => {
  const fuse = useMemo(() => {
    const options: IFuseOptions<Product> = {
      keys: ["name", "barcode"],
      includeScore: true,
      includeMatches: true,
      threshold: 0.2,
      minMatchCharLength: 2,
    };

    return new Fuse<Product>(products, options);
  }, [products]);

  // Typed search function
  const search = (query: string) => {
    return fuse.search(query).map((q) => q.item);
  };

  return search;
};
