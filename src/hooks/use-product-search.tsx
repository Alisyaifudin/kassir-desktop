import { useMemo } from "react";
import { Product } from "~/database/product/cache";
import createFuzzySearch from "@nozbe/microfuzz";

export const useProductSearch = (products: Product[]) => {
  const [fuzzyName, fuzzyBarcode] = useMemo(() => {
    const fuzzyName = createFuzzySearch(products, {
      key: "name",
      strategy: "smart",
    });
    const fuzzyBarcode = createFuzzySearch(products, {
      key: "barcode",
      strategy: "smart",
    });
    return [fuzzyName, fuzzyBarcode] as const;
  }, [products]);

  // Typed search function
  const search = (query: string) => {
    const resNames = fuzzyName(query);
    const resBarcode = fuzzyBarcode(query);
    const map = new Map(resNames.map((p) => [p.item.id, p]));
    for (const b of resBarcode) {
      const item = map.get(b.item.id);
      if (item === undefined) {
        map.set(b.item.id, b);
        continue;
      }
      if (b.score > item.score) {
        map.set(b.item.id, b);
      }
    }
    const res = Array.from(map.values());
    res.sort((a, b) => a.score - b.score);
    return res;
  };

  return search;
};
