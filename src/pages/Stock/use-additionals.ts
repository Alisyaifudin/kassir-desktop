import { useExtraSearch } from "~/hooks/use-extra-search-fuzzysort";
import { useSearchParams } from "./use-search-params";

export function useFilterAdditionals(all: DB.AdditionalItem[]) {
  const { search } = useExtraSearch();
  const { get } = useSearchParams();
  const { query } = get;
  const p = all.sort((a, b) => a.name.localeCompare(b.name));
  const products: DB.AdditionalItem[] = query.trim() === "" ? p : search(query.trim(), p);
  return products;
}
