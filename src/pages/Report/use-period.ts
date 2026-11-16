import { useSearchParams } from "~/services/route/react";
import { isPeriodKind, type PeriodKind } from "~/services/report/period";

/** Defaults to a single day, which is what the screen opens on. */
function getPeriod(search: URLSearchParams): PeriodKind {
  const raw = search.get("period");
  return isPeriodKind(raw) ? raw : "day";
}

/**
 * How much the report covers, kept in the URL.
 *
 * The write deletes `selected` for the same reason `useTime` does: a selection
 * belongs to the period it was picked in, and carrying it across a change of scope
 * would leave the right pane showing a record from a range the rail no longer
 * lists.
 */
export function usePeriod() {
  const [search, setSearch] = useSearchParams();
  const period = getPeriod(search);
  function setPeriod(next: PeriodKind) {
    setSearch(
      (old) => {
        const params = new URLSearchParams(old);
        if (next === "day") params.delete("period");
        else params.set("period", next);
        params.delete("selected");
        return params;
      },
      { replace: true },
    );
  }
  return [period, setPeriod] as const;
}
