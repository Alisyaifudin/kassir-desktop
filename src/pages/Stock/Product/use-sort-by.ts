import { useCallback } from "react";
import { useSearchParams } from "react-router";
import { z } from "zod";

export function useSortBy() {
  const [search, setSearch] = useSearchParams();
  const sortBy = z
    .enum(["barcode", "name", "price", "capital", "stock"])
    .catch("name")
    .parse(search.get("sort-by"));
  const set = useCallback(
    (sortBy: string) => {
      const s = new URLSearchParams(window.location.search);
      s.set("sort-by", sortBy);
      s.set("page", "1");
      setSearch(s);
    },
    [sortBy]
  );
  return [sortBy, set] as const;
}
