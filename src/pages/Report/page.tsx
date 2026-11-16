import { useMemo } from "react";
import { useDelayedFlag } from "~/components/Loader";
import { useSelected } from "~/hooks/use-selected";
import { useTime } from "~/hooks/use-time";
import { cn } from "~/lib/utils";
import { rangeOf, type PeriodKind } from "~/services/report/period";
import { pageData, reportSources } from "./data";
import { usePeriod } from "./use-period";
import { useView } from "./use-view";
import { Header } from "./z-Header";
import { PaneSkeleton } from "./z-Loading";
import { Prompt } from "./z-Prompt";
import { DayRail } from "./z-DayRail";
import { Rail } from "./z-Rail";
import { ReportErrorFallback } from "./z-Error";
import { Viewer } from "./z-Viewer";
import { Wizard } from "./z-Detail";

/**
 * The report screen: `/records`' grid, with the right pane swapped for the
 * classifier.
 *
 * ```text
 * grid-cols-[300px_1px_1fr]
 * ```
 *
 * The left rail is the day and never changes with the view; the right pane is
 * whichever face the header's tabs name. Keeping the rail fixed is what makes
 * `Klasifikasi | Laporan` feel like one screen rather than two.
 */
const GRID =
  "grid gap-2 h-full overflow-hidden transition-opacity duration-200 grid-cols-[300px_1px_1fr]";

export default function Page() {
  const [{ time }] = useTime();
  const [period] = usePeriod();
  const [view] = useView();

  // The range the *report* covers follows the period; the range the *rail* covers
  // is always the day, because the classifier works a day at a time.
  const range = useMemo(() => rangeOf(period, time), [period, time]);
  const day = useMemo(() => rangeOf("day", time), [time]);

  // The bounds are passed rather than the objects: `rangeOf` allocates a new
  // `Range` each render, so depending on the objects would re-subscribe forever.
  const { start: dayStart, end: dayEnd } = day;
  const { start: rangeStart, end: rangeEnd } = range;
  const sources = useMemo(
    () =>
      reportSources(
        { start: dayStart, end: dayEnd },
        { start: rangeStart, end: rangeEnd },
        period,
      ),
    [dayStart, dayEnd, rangeStart, rangeEnd, period],
  );

  return (
    // `deps` carries both ranges: a week report whose *day* changed needs the
    // classifier's reads refreshed even though the week did not move.
    <pageData.Provider sources={sources} deps={[day.start, day.end, range.start, range.end]}>
      <Screen time={time} range={range} view={view} period={period} />
    </pageData.Provider>
  );
}

function Screen({
  time,
  range,
  view,
  period,
}: {
  time: number;
  range: { start: number; end: number };
  view: "klasifikasi" | "laporan";
  period: PeriodKind;
}) {
  const [selected] = useSelected();
  // A refetch keeps the previous day on screen; `busy` locks the header and fades
  // the panes until the new one arrives. Only the *word* is read here — the rail
  // and the pane are gated on their own reads, below.
  const busy = useDelayedFlag(pageData.useStatus("day") === "refreshing");

  return (
    <main className="flex flex-col gap-2 p-0.5 flex-1 overflow-hidden h-[calc(100vh-48px)]">
      <Header />
      <div className="flex-1 min-h-0">
        <div aria-busy={busy} className={cn(GRID, busy && "opacity-50 pointer-events-none")}>
          <div className="h-full overflow-hidden">
            {/* The rail always shows what you can click to act: a record to
                classify, or a day to open. */}
            {view === "laporan" && period !== "day" ? <DayRail /> : <Rail />}
          </div>
          <div className="border-l h-full" />
          <div className="h-full overflow-hidden">
            {view === "laporan" ? (
              <Viewer kind={period} range={range} />
            ) : (
              <Pane selected={selected} time={time} />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

/**
 * The classifier's pane — the prompt until phase 6 fills it.
 *
 * Gated on `day` alone: whether there is a report, and whether there is anything
 * to classify, is one read. Phase 6 adds the second gate inside it, on the
 * selected record, so walking the rail never re-reads the day.
 */
function Pane({ selected, time }: { selected: string | null; time: number }) {
  return (
    <pageData.Gate
      // `categories` is gated here rather than in the wizard so it is read once for
      // the day instead of once per record: walking 150 records would otherwise
      // re-read the same six rows 150 times.
      keys={["day", "categories"]}
      pulse={<PaneSkeleton />}
      error={(error) => <ReportErrorFallback error={error} />}
    >
      {({ day, categories }) =>
        day.started && selected !== null ? (
          <Wizard records={day.records} recordId={selected} categories={categories} />
        ) : (
          <Prompt day={day} time={time} />
        )
      }
    </pageData.Gate>
  );
}
