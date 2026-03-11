import { useSearchParams } from "react-router";
import { useDebouncedCallback } from "use-debounce";
import { z } from "zod";
import { DEBOUNCE_DELAY } from "~/lib/constants";

export function useQuery() {
  const [search, setSearch] = useSearchParams();
  const query = z.string().catch("").parse(search.get("q"));
  const setDebounce = useDebouncedCallback((query: string) => {
    setSearch((old) => {
      const s = new URLSearchParams(old);
      s.set("q", query);
      return s;
    });
  }, DEBOUNCE_DELAY);
  return [query, setDebounce] as const;
}
