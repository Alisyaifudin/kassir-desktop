import Fuse, { IFuseOptions, FuseResult } from "fuse.js";
import { useMemo } from "react";
import { Extra } from "~/database/extra/caches";
// Fuse returns the original item nested within the result object
export type FuseProductSearchResult = FuseResult<Extra>;

export const useExtraSearch = (products: Extra[]) => {
  const fuse = useMemo(() => {
    const options: IFuseOptions<Extra> = {
      keys: ["name"],
      includeScore: true,
      includeMatches: true,
      threshold: 0.2,
    };

    return new Fuse<Extra>(products, options);
  }, [products]);

  // Typed search function
  const search = (query: string) => {
    const res = fuse.search(query);
    return res.map((q) => q.item);
  };

  return search;
};
