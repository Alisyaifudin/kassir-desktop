import { useExtraSearch } from "~/hooks/use-extra-search";
import { useSearchParams } from "./use-search-params";
import { Extra } from "~/database/extra/caches";

export function useFilterExtras(all: Extra[]) {
  const search = useExtraSearch(all);
  const { get } = useSearchParams();
  const { query } = get;
  const p = all.sort((a, b) => a.name.localeCompare(b.name));
  const extras: Extra[] = query.trim() === "" ? p : search(query.trim());
  return extras;
}
