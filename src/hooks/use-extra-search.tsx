import { useMemo } from "react";
import createFuzzySearch from "@nozbe/microfuzz";

/**
 * Fuzzy search over anything with a `name`, ranked by match quality. Generic so
 * each caller keeps its own row type: the extra catalog here, the POS extra
 * picker elsewhere.
 */
export function useExtraSearch<T extends { name: string }>(items: T[]) {
  const search = useMemo(() => createFuzzySearch(items, { key: "name" }), [items]);
  return search;
}
