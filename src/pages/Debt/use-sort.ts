import { useSearchParams } from "react-router";
import { z } from "zod";

export type DebtSortBy = "paidAt" | "total";
export type DebtSortDir = "asc" | "desc";

export function useSort() {
  const [search, setSearch] = useSearchParams();
  const sortBy = z.enum(["paidAt", "total"]).catch("paidAt").parse(search.get("sort-by"));
  const sortDir = z.enum(["asc", "desc"]).catch("desc").parse(search.get("sort-dir"));

  const setSort = (by: DebtSortBy, dir: DebtSortDir) => {
    setSearch((old) => {
      const s = new URLSearchParams(old);
      s.set("sort-by", by);
      s.set("sort-dir", dir);
      return s;
    });
  };

  return [{ sortBy, sortDir }, setSort] as const;
}
