import { useCallback, useMemo } from "react";
import Fuse, { IFuseOptions } from "fuse.js";
import { Item } from "~/database/product/get-by-range";

export const useItemSearch = (all: Item[], mode: "buy" | "sell", query: string) => {
  const filtered = all.filter((a) => a.mode === mode);
  const fuse = useMemo(() => {
    const options: IFuseOptions<Item> = {
      keys: ["name"],
      distance: 10,
      includeScore: true,
      includeMatches: true,
      threshold: 0.2,
      minMatchCharLength: 1,
    };
    return new Fuse<Item>(filtered, options);
  }, [filtered]);

  // Typed search function
  const search = useCallback(
    (query: string) => {
      return fuse.search(query);
    },
    [filtered]
  );
  const searched = useMemo(() => {
    if (query.trim() === "") {
      return filtered;
    }
    const res = search(query);
    return res.map((r) => r.item);
  }, [query, search, filtered]);
  return searched;
};
