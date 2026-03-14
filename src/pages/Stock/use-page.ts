import { useCallback } from "react";
import { useSearchParams } from "react-router";
import { integer } from "~/lib/utils";

export function usePage() {
  const [search, setSearch] = useSearchParams();
  const page = integer.catch(1).parse(search.get("page"));
  const set = useCallback(
    (page: number) => {
      setSearch((old) => {
        const s = new URLSearchParams(old);
        s.set("page", page.toString());
        return s;
      });
    },
    [setSearch],
  );
  return [page, set] as const;
}
