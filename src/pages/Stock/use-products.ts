import { useProductSearch } from "~/hooks/use-product-search";
import { sorting } from "./sorting";
import { useSearchParams } from "./use-search-params";
import { Product } from "~/database/product/caches";

export function useFilterProducts(all: Product[]) {
  const { get } = useSearchParams();
  const { query, sortBy, sortDir } = get;
  const sorted = sorting(all, sortBy, sortDir);
  const search = useProductSearch(sorted);
  if (query.trim() === "") {
    return all;
  }
  let p = search(query.trim());
  return p.map((p) => p.item);
}
