import { useMemo } from "react";
import { Product } from "~/database/product/caches";
import createFuzzySearch from "@nozbe/microfuzz";

export const useProductSearch = (products: Product[]) => {
  const [fuzzyName, fuzzyBarcode] = useMemo(() => {
    const fuzzyName = createFuzzySearch(products, {
      key: "name",
      strategy: "aggressive",
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
    const map = new Map(resNames.map((p) => [p.item.name, p]));
    for (const b of resBarcode) {
      const item = map.get(b.item.name);
      if (item === undefined) {
        map.set(b.item.name, b);
        continue;
      }
      if (b.score > item.score) {
        map.set(b.item.name, b);
      }
    }
    const res = Array.from(map.values());
    res.sort((a, b) => a.score - b.score);
    return res.map((r) => r.item);
  };

  return search;
};
