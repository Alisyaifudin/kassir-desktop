import { useCallback } from "react";
import { useSearchParams } from "react-router";
import { z } from "zod";

export function useLimit() {
  const [search, setSearch] = useSearchParams();
  const limit = z
    .enum(["10", "20", "50", "100"])
    .catch("100")
    .transform(Number)
    .parse(search.get("limit"));
  const set = useCallback(
    (limit: number) => {
      setSearch((old) => {
        const s = new URLSearchParams(old);
        s.set("limit", limit.toString());
        return s;
      });
    },
    [setSearch],
  );
  return [limit, set] as const;
}
