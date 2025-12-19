import { useCallback } from "react";
import { useSearchParams } from "react-router";
import { z } from "zod";

export function useAttention() {
  const [search, setSearch] = useSearchParams();
  const attention = z
    .string()
    .nullable()
    .transform((v) => v === "true")
    .parse(search.get("attention"));
  const set = useCallback(
    (attention: boolean) => {
      const s = new URLSearchParams(window.location.search);
      if (attention) {
        s.set("attention", "true");
      } else {
        s.delete("attention");
      }
      setSearch(s);
    },
    [attention]
  );
  return [attention, set] as const;
}
