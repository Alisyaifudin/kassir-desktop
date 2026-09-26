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
      setSearch((old) => {
        const s = new URLSearchParams(old);
        if (attention) {
          s.set("attention", "true");
        } else {
          s.delete("attention");
        }
        return s;
      });
    },
    [setSearch],
  );
  return [attention, set] as const;
}
