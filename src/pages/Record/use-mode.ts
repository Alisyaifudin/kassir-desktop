import { useSearchParams } from "react-router";
import { z } from "zod";
import type { RecordMode } from "~/services/record";

/** Defaults to `incoming` (penjualan), which is what the page opens on. */
function getMode(search: URLSearchParams): RecordMode {
  const parsed = z.enum(["incoming", "outcoming"]).safeParse(search.get("mode"));
  return parsed.success ? parsed.data : "incoming";
}

/**
 * Whether the list shows penjualan or pembelian, kept in the URL.
 *
 * The write **replaces** the history entry: switching the tab is a filter inside
 * this screen, not a place to go Back to.
 */
export function useMode() {
  const [search, setSearch] = useSearchParams();
  const mode = getMode(search);
  function setMode(mode: RecordMode) {
    setSearch(
      (old) => {
        const next = new URLSearchParams(old);
        next.set("mode", mode);
        next.delete("selected");
        return next;
      },
      { replace: true },
    );
  }
  return [mode, setMode] as const;
}
