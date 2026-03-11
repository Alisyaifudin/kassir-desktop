import createFuzzySearch from "@nozbe/microfuzz";
import { useMemo } from "react";
import { Item } from "~/database-effect/product/get-by-range";

export const useItemSearch = (all: Item[], query: string) => {
  const fuzzy = useMemo(() => {
    const fuzzy = createFuzzySearch(all, {
      key: "name",
      strategy: "smart",
    });
    return fuzzy;
  }, []);

  const searched = useMemo(() => {
    if (query.trim() === "") {
      return all;
    }
    const res = fuzzy(query);
    return res.map((r) => r.item);
  }, [query, fuzzy, all]);
  console.log(">>>", query, "<<<", searched);
  return searched;
};
