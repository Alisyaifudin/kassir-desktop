import { useSearchParams } from "react-router";
import { z } from "zod";

function getMode(search: URLSearchParams) {
  const parsed = z.enum(["sell", "buy"]).safeParse(search.get("mode"));
  const mode = parsed.success ? parsed.data : "sell";
  return mode;
}

export function useMode() {
  const [search, setSearch] = useSearchParams();
  const mode = getMode(search);
  function setMode(mode: DB.Mode) {
    setSearch((old) => {
      const search = new URLSearchParams(old);
      search.set("mode", mode);
      search.delete("selected");
      return search;
    });
  }
  return [mode, setMode] as const;
}
