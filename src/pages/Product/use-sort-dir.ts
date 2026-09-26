import { useCallback } from "react";
import { useSearchParams } from "react-router";
import { z } from "zod";

export function useSortDir() {
  const [search, setSearch] = useSearchParams();
  const sortDir = z.enum(["asc", "desc"]).catch("asc").parse(search.get("sort-dir"));
  const set = useCallback(
    (sortDir: string) => {
      setSearch((old) => {
        const s = new URLSearchParams(old);
        s.set("sort-dir", sortDir);
        s.set("page", "1");
        return s;
      });
    },
    [setSearch],
  );
  return [sortDir, set] as const;
}
