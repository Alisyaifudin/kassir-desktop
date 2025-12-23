import Fuse, { IFuseOptions } from "fuse.js";
import { useCallback, useMemo } from "react";
import { Product } from "~/database/product/caches";

export const useProductSearch = (products: Product[]) => {
  const fuse = useMemo(() => {
    const options: IFuseOptions<Product> = {
      keys: ["name", "barcode"],
      includeScore: true,
      includeMatches: true,
      threshold: 0.2,
      minMatchCharLength: 1,
    };
    return new Fuse<Product>(products, options);
  }, [products]);

  // Typed search function
  const search = useCallback(
    (query: string) => {
      return fuse.search(query).map((p) => p.item);
    },
    [products]
  );

  return search;
};
