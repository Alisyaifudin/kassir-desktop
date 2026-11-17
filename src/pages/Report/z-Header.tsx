import { ChevronLeft, ChevronRight, Tags } from "lucide-react";
import { Calendar } from "~/components/Calendar";
import { useDelayedFlag } from "~/components/Loader";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { useTime } from "~/hooks/use-time";
import { Link } from "~/services/route/react";
import { labelOf, rangeOf, step } from "~/services/report/period";
import { pageData } from "./data";
import { usePeriod } from "./use-period";
import { useView, type ReportView } from "./use-view";

/**
 * The day/period stepper, the view tabs, and what is left to do.
 *
 * `/records`' header with two changes: the `Masuk | Keluar` tabs are gone (a
 * report needs both directions, so the rail carries a direction pill per row
 * instead), and the search cluster is replaced by two numbers.
 *
 * The stepper's **unit follows the period**: `Minggu` steps a week, `Bulan` a
 * month. One control, so a day stepper and a period selector can never disagree
 * about which range is on screen. `Calendar` already speaks month and year, so
 * the picker opens in the right mode for free.
 */
export function Header() {
  const [{ time, yesterday, tomorrow }, setTime] = useTime();
  // Read-only here: the period tabs live in the `Laporan` pane beside the report
  // they scope (phase 7). The stepper still follows whatever period is chosen.
  const [period] = usePeriod();
  const [view, setView] = useView();
  const busy = useDelayedFlag(pageData.useStatus("day") === "refreshing");

  const label = labelOf(period, rangeOf(period, time));
  const previous = step(period, time, -1);
  const next = step(period, time, 1);

  return (
    <fieldset
      disabled={busy}
      className="flex gap-2 items-center w-full justify-between bg-background/50 backdrop-blur-sm sticky top-0 z-10"
    >
      <div className="flex items-center gap-1.5">
        <ViewTabs view={view} setView={setView} />
      </div>

      <div className="flex items-center bg-muted/30 gap-1 p-0.5 rounded-lg">
        <Button
          size="icon"
          variant="ghost"
          aria-label={`${PERIOD_ARIA[period]} sebelumnya`}
          title={`${PERIOD_ARIA[period]} sebelumnya`}
          // For a day the neighbours come from `useTime`, which already computed
          // them; every longer period steps through `period.ts`.
          onClick={() => setTime(period === "day" ? yesterday : previous)}
          className="rounded-md text-muted-foreground hover:text-foreground hover:bg-background transition-all"
        >
          <ChevronLeft className="size-5 [--icon-stroke:2.5]" />
        </Button>

        <Calendar
          time={time}
          setTime={(picked) => setTime(picked)}
          // The picker opens on the granularity being shown: a week report is
          // picked from a month grid, not a day grid.
          mode={period === "year" ? "year" : period === "day" ? "day" : "month"}
        >
          {label}
        </Calendar>

        <Button
          size="icon"
          variant="ghost"
          aria-label={`${PERIOD_ARIA[period]} berikutnya`}
          title={`${PERIOD_ARIA[period]} berikutnya`}
          onClick={() => setTime(period === "day" ? tomorrow : next)}
          className="rounded-md text-muted-foreground hover:text-foreground hover:bg-background transition-all"
        >
          <ChevronRight className="size-5 [--icon-stroke:2.5]" />
        </Button>
      </div>

      <div className="flex items-center gap-1.5">
        <Counter />
        {/* A step *out* of this screen, so `push`: Back must return to the day the
            operator was classifying, not walk the categories. */}
        <Button variant="outline" className="h-10 gap-1.5 px-3" asChild>
          <Link to="/report/categories" behavior="push">
            <Tags className="size-4" />
            Kategori
          </Link>
        </Button>
      </div>
    </fieldset>
  );
}

/** The unit each stepper says out loud, for the buttons' accessible names. */
const PERIOD_ARIA = {
  day: "Hari",
  week: "Minggu",
  month: "Bulan",
  quarter: "Kuartal",
  year: "Tahun",
} as const;

function ViewTabs({ view, setView }: { view: ReportView; setView: (view: ReportView) => void }) {
  return (
    <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-muted/50 border border-border/50">
      {(["klasifikasi", "laporan"] as const).map((face) => (
        <Button
          key={face}
          variant="ghost"
          className={cn(
            "px-3 h-10 text-base font-bold rounded-md transition-all duration-200",
            view === face
              ? "bg-background text-primary shadow-sm hover:bg-background"
              : "text-muted-foreground hover:text-foreground hover:bg-transparent",
          )}
          onClick={() => setView(face)}
        >
          {face === "klasifikasi" ? "Klasifikasi" : "Laporan"}
        </Button>
      ))}
    </div>
  );
}

/**
 * How much of the day still has no category.
 *
 * Lines, not records: after **Buat laporan** almost every record already has
 * categories, so a per-record "reviewed" number would open at 149/150 and measure
 * nothing. This one starts at the handful of unknown extras and reaches zero when
 * the day is done.
 *
 * Rendered through its own gate so the header never blocks on a read — a `null`
 * pulse leaves the space empty for the anti-flash window, which is what a value
 * inside a line wants (`page-data` skill).
 */
function Counter() {
  return (
    <pageData.Gate keys={["progress"]} pulse={null} delay={0} error={() => null}>
      {({ progress }) => (
        <div className="flex items-center gap-2 px-3 h-10 rounded-lg bg-muted/30">
          {progress.unclassified > 0 ? (
            <p className="text-sm tabular-nums text-muted-foreground">
              <span className="font-semibold text-foreground">{progress.unclassified}</span> dari{" "}
              {progress.lines} baris belum jelas
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Semua baris sudah jelas</p>
          )}
        </div>
      )}
    </pageData.Gate>
  );
}
