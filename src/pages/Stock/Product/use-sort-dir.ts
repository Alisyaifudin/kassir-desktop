import { useCallback } from "react";
import { useSearchParams } from "react-router";
import { z } from "zod";

export function useSortDir() {
  const [search, setSearch] = useSearchParams();
  const sortDir = z.enum(["asc", "desc"]).catch("asc").parse(search.get("sort-dir"));
  const set = useCallback(
    (sortDir: string) => {
      const s = new URLSearchParams(window.location.search);
      s.set("sort-dir", sortDir);
      s.set("page", "1");
      setSearch(s);
    },
    [sortDir]
  );
  return [sortDir, set] as const;
}
