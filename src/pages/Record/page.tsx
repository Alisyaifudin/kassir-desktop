import { useMemo } from "react";
import { useSearchParams } from "react-router";
import { Gate } from "~/components/page-data";
import { useDelayedFlag } from "~/components/Loader";
import { cn } from "~/lib/utils";
import { pageData, recordsSource } from "./data";
import { Header } from "./z-Header";
import { Records } from "./z-Record";
import { Detail } from "./z-Detail";
import { useSelected } from "./use-selected";
import { useTime } from "./use-time";
import { RecordsErrorFallback } from "./z-Error";
import { RecordsLoading } from "./z-Loading";

const GRID =
  "grid gap-2 h-full overflow-hidden transition-opacity duration-200 grid-cols-[490px_1px_1fr] small:grid-cols-[335px_1px_1fr]";

/**
 * The day's list and the selected record beside it.
 *
 * The header is static and only locks while a new day is on its way; the split
 * pane, the divider and the empty right side are layout, not data. Only the left
 * list waits — and the right pane waits on its own record, independently.
 */
export default function Page() {
  const [day] = useTime();
  const [search] = useSearchParams();
  const query = search.get("query") ?? "";

  const sources = useMemo(() => ({ records: recordsSource(day.start, day.end, query) }), [
    day.start,
    day.end,
    query,
  ]);

  return (
    <pageData.Provider sources={sources} deps={[day.start, day.end, query]}>
      <Screen />
    </pageData.Provider>
  );
}

function Screen() {
  const res = pageData.use("records");
  const [selected] = useSelected();
  // A refetch keeps the previous day on screen; `busy` locks the header and fades
  // the panes until the new day arrives.
  const busy = useDelayedFlag(res.type === "success" && res.refetching === true);

  return (
    <main className="flex flex-col gap-2 p-0.5 flex-1 overflow-hidden h-[calc(100vh-64px)] small:h-[calc(100vh-48px)]">
      <Header busy={busy} />
      <div className="flex-1 min-h-0">
        <div
          aria-busy={busy}
          className={cn(GRID, busy && "opacity-50 pointer-events-none")}
        >
          <div className="h-full overflow-hidden">
            <Gate
              res={res}
              skeleton={<RecordsLoading />}
              error={(error) => <RecordsErrorFallback error={error} />}
            >
              {({ data }) => <Records records={data} />}
            </Gate>
          </div>
          <div className="border-l h-full" />
          <div className="h-full overflow-hidden">
            {selected === null ? null : <Detail recordId={selected} />}
          </div>
        </div>
      </div>
    </main>
  );
}
