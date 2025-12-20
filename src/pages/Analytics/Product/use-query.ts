import { useState } from "react";
import { useSearchParams } from "react-router";
import { useDebouncedCallback } from "use-debounce";
import { z } from "zod";
import { DEBOUNCE_DELAY } from "~/lib/constants";

export function useQuery() {
  const [search, setSearch] = useSearchParams();
  const q = z.string().catch("").parse(search.get("q"));
  const [query, setQuery] = useState(q);
  const setDebounce = useDebouncedCallback((query: string) => {
    const s = new URLSearchParams(window.location.search);
    s.set("q", query);
    setSearch(s);
  }, DEBOUNCE_DELAY);
  const setQ = (query: string) => {
    setQuery(query);
    setDebounce(query)
  }
  return [query, setQ] as const;
}
