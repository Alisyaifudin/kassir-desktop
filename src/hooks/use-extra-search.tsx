import { useMemo } from "react";
import createFuzzySearch from "@nozbe/microfuzz";

/**
 * Fuzzy search over anything with a `name`, ranked by match quality. The memo
 * lives here so the index is rebuilt only when the list changes, not on every
 * keystroke; the caller keeps its own row type.
 */
export function useExtraSearch<T extends { name: string }>(items: T[]) {
  return useMemo(() => createFuzzySearch(items, { key: "name" }), [items]);
}
