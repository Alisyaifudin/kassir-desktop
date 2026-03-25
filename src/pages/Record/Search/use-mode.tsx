import { useSearchParams } from "react-router";
import { z } from "zod";

export function useMode() {
  const [search, setSearch] = useSearchParams();
  const mode = z.enum(["buy", "sell"]).catch("sell").parse(search.get("mode"));
  function setMode(mode: string) {
    setSearch((old) => {
      const s = new URLSearchParams(old);
      s.set("mode", mode);
      return s;
    });
  }
  return [mode, setMode] as const;
}
