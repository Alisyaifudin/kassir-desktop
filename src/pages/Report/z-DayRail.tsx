import { useTime } from "~/hooks/use-time";
import { formatDate } from "~/lib/date";
import { cn } from "~/lib/utils";
import type { PeriodDay } from "~/services/report";
import { pageData } from "./data";
import { RailSkeleton } from "./z-Loading";
import { ReportErrorFallback } from "./z-Error";
import { useView } from "./use-view";

/**
 * The day rail the `Laporan` view uses for a period.
 *
 * The classifier's rail is the day's records; a week report's rail is the week's
 * *days*, each with whether it is finished — which is what turns
 * "3 hari belum lengkap" from a sentence into something to click.
 *
 * Clicking a day switches to `Klasifikasi` for it. The rail always answers "what
 * can I click to act"; in this view the answer is a day.
 */
export function DayRail() {
  return (
    <pageData.Gate
      keys={["days"]}
      pulse={<RailSkeleton />}
      error={(error) => <ReportErrorFallback error={error} />}
    >
      {({ days }) => <Rows days={days} />}
    </pageData.Gate>
  );
}

const GRID = "grid grid-cols-[1fr_62px_78px] gap-1 px-1.5 py-1.5 text-sm";

function Rows({ days }: { days: PeriodDay[] }) {
  const [{ time }] = useTime();
  const [, setTime] = useTime();
  const [, setView] = useView();

  const open = (day: number) => {
    setTime(day);
    setView("klasifikasi");
  };

  const done = days.filter((row) => row.unclassified === 0 && row.stale === 0).length;

  return (
    <div className="flex flex-col gap-1 overflow-hidden h-full">
      <div className={cn(GRID, "border-b pb-1 text-xs text-muted-foreground")} aria-hidden="true">
        <span>Tanggal</span>
        <span className="text-center">Rekaman</span>
        <span className="text-right">Status</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto" role="listbox" aria-label="Hari dalam rentang">
        {days.map((row) => {
          const complete = row.unclassified === 0 && row.stale === 0;
          return (
            <div
              key={row.day}
              role="option"
              aria-selected={row.day === time}
              tabIndex={row.day === time ? 0 : -1}
              onClick={() => open(row.day)}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                open(row.day);
              }}
              className={cn(
                GRID,
                "cursor-pointer rounded-sm text-muted-foreground hover:bg-muted",
                "[&:not(:last-child)]:border-b [&:not(:last-child)]:border-border/50",
                row.day === time && "bg-sky-200 text-foreground font-semibold hover:bg-sky-200",
              )}
            >
              <span className="truncate">{formatDate(row.day, "short")}</span>
              <span className="text-center tabular-nums">{row.records}</span>
              <span
                className={cn(
                  "text-right text-xs font-semibold",
                  complete ? "text-emerald-600" : "text-amber-600",
                )}
              >
                {complete ? "lengkap" : `${row.unclassified + row.stale} baris`}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex shrink-0 items-center justify-between border-t py-2 text-sm">
        {/* "Hari lengkap 1/1" over a seven-day week reads as if the week had one
            day. `days()` lists the days that *have* records — a day with nothing on
            it cannot be incomplete, so there is nothing to show for it — and the
            label has to say so. */}
        <p className="text-muted-foreground">Hari berisi, lengkap</p>
        <p className="font-semibold tabular-nums">
          {done}/{days.length}
        </p>
      </div>
    </div>
  );
}
