import { useProductSearch } from "~/hooks/use-product-search-fuzzysort";
import { sorting } from "./sorting";
import { useSearchParams } from "./use-search-params";

export function useFilterProducts(all: DB.Product[]) {
  const { search } = useProductSearch();
  const { get } = useSearchParams();
  const { query, sortBy, sortDir } = get;
  const products = sorting(all, sortBy, sortDir);
  const p = query.trim() === "" ? products : search(query.trim(), products);
  return p;
}
