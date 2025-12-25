import createFuzzySearch from "@nozbe/microfuzz";
import { useMemo } from "react";
import { Item } from "~/database/product/get-by-range";

export const useItemSearch = (all: Item[], mode: "buy" | "sell", query: string) => {
  const filtered = all.filter((a) => a.mode === mode);
  const fuzzy = useMemo(() => {
    const fuzzy = createFuzzySearch(all, {
      key: "name",
      strategy: "aggressive",
    });
    return fuzzy;
  }, [filtered]);

  const searched = useMemo(() => {
    if (query.trim() === "") {
      return filtered;
    }
    const res = fuzzy(query);
    return res.map((r) => r.item);
  }, [query, fuzzy, filtered]);
  return searched;
};
