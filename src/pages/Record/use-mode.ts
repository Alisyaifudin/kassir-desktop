import { useSearchParams } from "react-router";
import { z } from "zod";
import type { RecordMode } from "~/services/record";

/** Defaults to `incoming` (penjualan), which is what the page opens on. */
function getMode(search: URLSearchParams): RecordMode {
  const parsed = z.enum(["incoming", "outcoming"]).safeParse(search.get("mode"));
  return parsed.success ? parsed.data : "incoming";
}

export function useMode() {
  const [search, setSearch] = useSearchParams();
  const mode = getMode(search);
  function setMode(mode: RecordMode) {
    setSearch((old) => {
      const next = new URLSearchParams(old);
      next.set("mode", mode);
      next.delete("selected");
      return next;
    });
  }
  return [mode, setMode] as const;
}
