import { useCallback } from "react";
import { useSearchParams } from "react-router";

export function useQuery() {
  const [search, setSearch] = useSearchParams();
  const query = search.get("query") ?? "";
  const set = useCallback(
    (query: string) => {
      setSearch((old) => {
        const s = new URLSearchParams(old);
        if (query.trim() === "") {
          s.delete("query");
        } else {
          s.set("query", query);
        }
        return s;
      });
    },
    [setSearch],
  );
  return [query, set] as const;
}
