import { useSearchParams } from "react-router";
import { z } from "zod";

export function useMode() {
  const [search, setSearch] = useSearchParams();
  const mode = z.enum(["buy", "sell"]).catch("sell").parse(search.get("mode"));
  function setMode(mode: string) {
    const s = new URLSearchParams(window.location.search);
    s.set("mode", mode);
    setSearch(s);
  }
  return [mode, setMode] as const;
}
