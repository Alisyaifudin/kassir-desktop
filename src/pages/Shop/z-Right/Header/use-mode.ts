import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";
import z from "zod";

export function useMode() {
  const [search, setSearch] = useSearchParams();
  const mode = useMemo(() => {
    const mode = z.enum(["product", "extra"]).catch("product").parse(search.get("mode"));
    return mode;
  }, [search]);
  const setMode = useCallback(
    (mode: "product" | "extra") => {
      setSearch((prev) => {
        const search = new URLSearchParams(prev);
        search.set("mode", mode);
        return search;
      });
    },
    [setSearch],
  );
  return [mode, setMode] as const;
}
