import { useSearchParams } from "react-router";
import { z } from "zod";

export function useMode() {
  const [search, setSearch] = useSearchParams();
  const mode = z.enum(["sell", "buy"]).catch("sell").parse(search.get("mode"));
  const set = (mode: "sell" | "buy") => {
    setSearch((old) => {
      const s = new URLSearchParams(old);
      s.set("mode", mode.toString());
      return s;
    });
  };
  return [mode, set] as const;
}
