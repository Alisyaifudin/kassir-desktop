import { useSearchParams } from "react-router";
import { z } from "zod";

const modeSchema = z.enum(["sell", "buy"]);

export function useMode() {
  const [search, setSearch] = useSearchParams();
  const mode = modeSchema.catch("sell").parse(search.get("mode"));
  function setMode(mode: DB.Mode) {
    const s = new URLSearchParams(window.location.search);
    s.set("mode", mode);
    setSearch(s);
  }
  return [mode, setMode] as const;
}
