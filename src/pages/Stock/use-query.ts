import { useCallback } from "react";
import { useSearchParams } from "react-router";

export function useQuery() {
  const [search, setSearch] = useSearchParams();
  const query = search.get("query") ?? "";
  const set = useCallback(
    (query: string) => {
      const s = new URLSearchParams(window.location.search);
      if (query.trim() === "") {
        s.delete("query");
      } else {
        s.set("query", query);
      }
      setSearch(s);
    },
    [query]
  );
  return [query, set] as const;
}
