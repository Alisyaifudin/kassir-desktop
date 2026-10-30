import { useMemo } from "react";
import type { Record as RecordModel } from "~/services/record";
import { matchesMethod } from "../method-filter";
import { useMode } from "../use-mode";
import { useMethodFilter } from "../use-method";
import { List } from "./List";
import { recordsTotal } from "./total";

export function Records({ records }: { records: RecordModel[] }) {
  const [mode] = useMode();
  const { selection } = useMethodFilter();
  // The name search already happened in SQL, so this only narrows by the two
  // controls the service doesn't know about.
  const filtered = useMemo(
    () => records.filter((record) => record.mode === mode && matchesMethod(record, selection)),
    [records, mode, selection],
  );
  // The footer adds up what the list actually shows — the filtered methods only,
  // change taken off the tender that handed it back — so the figure under the
  // column is the column's own sum. See `total.ts`.
  const total = useMemo(() => recordsTotal(filtered, selection), [filtered, selection]);

  return (
    <div className="flex flex-col gap-1 overflow-hidden h-full">
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full overflow-hidden">
          <List records={filtered} selection={selection} />
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 py-2 border-t mt-auto">
        <p>Total</p>
        <p>: Rp{total.toLocaleString("id-ID")}</p>
      </div>
    </div>
  );
}
