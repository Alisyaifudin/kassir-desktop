import { useExtraSearch } from "~/hooks/use-extra-search";
import { Extra } from "~/database/extra/caches";
import { useQuery } from "./use-query";

export function useFilterExtras(all: Extra[]) {
  const search = useExtraSearch(all);
  const [query] = useQuery();
  const p = all.sort((a, b) => a.name.localeCompare(b.name));
  const extras: Extra[] = query.trim() === "" ? p : search(query.trim());
  return extras;
}
