import { useProductSearch } from "~/hooks/use-product-search";
import { sorting } from "./sorting";
import { Product } from "~/database/product/caches";
import { useQuery } from "./use-query";
import { useSortBy } from "./use-sort-by";
import { useSortDir } from "./use-sort-dir";
import { useAttention } from "./use-attention";

export function useFilterProducts(all: Product[]) {
  const [query] = useQuery();
  const [sortBy] = useSortBy();
  const [sortDir] = useSortDir();
  const [attention] = useAttention();
  let filtered = all;
  if (attention) {
    filtered = filtered.filter((s) => s.capital >= s.price);
  }
  let sorted = sorting(filtered, sortBy, sortDir);
  const search = useProductSearch(sorted);
  if (query.trim() === "") {
    return filtered;
  }
  let p = search(query.trim());
  return p.map((p) => p.item);
}
