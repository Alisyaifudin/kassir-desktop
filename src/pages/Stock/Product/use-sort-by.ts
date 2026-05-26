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
      setSearch((old) => {
        const s = new URLSearchParams(old);
        s.set("sort-by", sortBy);
        s.set("page", "1");
        return s;
      });
    },
    [setSearch],
  );
  return [sortBy, set] as const;
}
