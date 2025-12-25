import { useMemo } from "react";
import createFuzzySearch from "@nozbe/microfuzz";
import { Extra } from "~/database/extra/caches";
// Fuse returns the original item nested within the result object

export const useExtraSearch = (products: Extra[]) => {
  const fuzz = useMemo(() => {
    const fuzzy = createFuzzySearch(products, {
      key: "name",
    });
    return fuzzy
  }, [products]);

  // Typed search function
  const search = (query: string) => {
    const res = fuzz(query);
    return res.map((q) => q.item);
  };

  return search;
};
