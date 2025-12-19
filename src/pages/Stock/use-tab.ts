import { useCallback } from "react";
import { useSearchParams } from "react-router";
import { z } from "zod";

export function useTab() {
  const [search, setSearch] = useSearchParams();
  const tab = z.enum(["product", "extra"]).catch("product").parse(search.get("tab"));
  const set = useCallback(
    (tab: string) => {
      const s = new URLSearchParams(window.location.search);
      s.set("tab", tab);
      s.set("page", "1");
      s.set("query", "");
      setSearch(s);
    },
    [tab]
  );
  return [tab, set] as const;
}
