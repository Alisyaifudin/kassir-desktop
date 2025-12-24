import { useSearchParams } from "react-router";
import { integer } from "~/lib/utils";

export function useLimit() {
  const [search, setSearch] = useSearchParams();
  const limit = integer.catch(100).parse(search.get("limit"));
  const setLimit = (func: (limit: number) => number) => {
    const l = func(limit);
    const s = new URLSearchParams(window.location.search);
    s.set("limit", l.toString());
    setSearch(s);
  };
  return [limit, setLimit] as const;
}
