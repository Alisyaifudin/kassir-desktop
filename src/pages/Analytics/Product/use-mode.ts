import { useSearchParams } from "react-router";
import { z } from "zod";

export function useMode() {
  const [search, setSearch] = useSearchParams();
  const mode = z.enum(["sell", "buy"]).catch("sell").parse(search.get("mode"));
  const set = (mode: "sell" | "buy") => {
    const s = new URLSearchParams(window.location.search);
    s.set("mode", mode.toString());
    setSearch(s);
  };
  return [mode, set] as const;
}
