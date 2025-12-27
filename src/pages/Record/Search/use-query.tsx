import { useSearchParams } from "react-router";
import { z } from "zod";

export function useQuery() {
  const [search, setSearch] = useSearchParams();
  const query = z.string().catch("").parse(search.get("query"));
  function setQuery(query: string) {
    const s = new URLSearchParams(window.location.search);
    s.set("query", query);
    setSearch(s);
  }
  return [query, setQuery] as const;
}
