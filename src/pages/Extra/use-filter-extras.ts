import { useMemo } from "react";
import { useExtraSearch } from "~/hooks/use-extra-search";
import type { Extra } from "~/services/extra";
import { useQuery } from "./use-query";

/**
 * The catalog, narrowed by the `query` param. A blank query keeps the list as
 * the service ordered it; otherwise the fuzzy ranking decides.
 */
export function useFilterExtras(all: Extra[]): Extra[] {
  const search = useExtraSearch(all);
  const [query] = useQuery();
  return useMemo(() => {
    const trimmed = query.trim();
    return trimmed === "" ? all : search(trimmed).map((result) => result.item);
  }, [all, query, search]);
}
