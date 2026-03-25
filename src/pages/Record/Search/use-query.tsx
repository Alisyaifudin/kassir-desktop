import { useSearchParams } from "react-router";
import { z } from "zod";

export function useQuery() {
  const [search, setSearch] = useSearchParams();
  const query = z.string().catch("").parse(search.get("query"));
  function setQuery(query: string) {
    setSearch((old) => {
      const s = new URLSearchParams(old);
      s.set("query", query);
      return s;
    });
  }
  return [query, setQuery] as const;
}
