import { useSearchParams } from "react-router";
import { z } from "zod";

const modeSchema = z.enum(["sell", "buy"]);

export function useMode() {
  const [search, setSearch] = useSearchParams();
  const mode = modeSchema.catch("sell").parse(search.get("mode"));
  function setMode(mode: DB.Mode) {
    setSearch((old) => {
      const s = new URLSearchParams(old);
      s.set("mode", mode);
      return s;
    });
  }
  return [mode, setMode] as const;
}
