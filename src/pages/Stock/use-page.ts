import { useCallback } from "react";
import { useSearchParams } from "react-router";
import { integer } from "~/lib/utils";

export function usePage() {
  const [search, setSearch] = useSearchParams();
  const page = integer.catch(1).parse(search.get("page"));
  const set = useCallback(
    (page: number) => {
      const s = new URLSearchParams(window.location.search);
      s.set("page", page.toString());
      setSearch(s);
    },
    [page]
  );
  return [page, set] as const;
}
