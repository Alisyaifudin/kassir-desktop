import { useSearchParams } from "react-router";
import { z } from "zod";

export function useSort() {
  const [search, setSearch] = useSearchParams();
  const sortBy = z.enum(["name", "qty"]).catch("name").parse(search.get("sort-by"));
  const sortDir = z.enum(["asc", "desc"]).catch("asc").parse(search.get("sort-dir"));
  const setSort = (by: "name" | "qty", dir: "asc" | "desc") => {
    const s = new URLSearchParams(window.location.search);
    s.set("sort-by", by);
    s.set("sort-dir", dir);
    setSearch(s);
  };
  return [{ sortBy, sortDir }, setSort] as const;
}
