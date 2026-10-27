import { useEffect } from "react";
import { Calendar } from "~/components/Calendar";
import { DateRange } from "~/components/DateRange";
import { Button } from "~/components/ui/button";
import { formatDate } from "~/lib/date";
import { cn } from "~/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DAY_MS, INTERVALS, PRESETS, useRange, weekRange } from "./use-range";

/**
 * The period controls in the analytics header.
 *
 * `date` pages keep the presets and add a hand-picked range; `week` pages (only
 * Waktu) move a single week at a time, because an hour-of-day histogram read
 * across 30 days mixes paydays with Mondays. The bucket width only exists where
 * the page plots a time series.
 */
export function RangeBar({
  mode = "date",
  showInterval = true,
}: {
  mode?: "date" | "week";
  showInterval?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      {mode === "week" ? (
        <p className="text-sm font-semibold">Transaksi per minggu</p>
      ) : (
        <Presets />
      )}
      <div className="flex flex-wrap items-center gap-3">
        {mode === "week" ? <WeekPicker /> : <CustomRange />}
        {showInterval ? <Intervals /> : null}
      </div>
    </div>
  );
}

function Presets() {
  const { preset, setPreset } = useRange();
  return (
    <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Periode">
      {PRESETS.map((option) => (
        <Button
          key={option.key}
          type="button"
          size="sm"
          variant={preset === option.key ? "default" : "ghost"}
          aria-pressed={preset === option.key}
          onClick={() => setPreset(option.key)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}

/** The presets are coarse; this opens the calendar for an exact period. */
function CustomRange() {
  const { from, to, setRange } = useRange();
  return (
    <DateRange
      className="text-sm"
      // `DateRange` speaks inclusive days; the analytics period is exclusive.
      range={[from, to - DAY_MS]}
      setRange={(start, end) => setRange(start, end + DAY_MS)}
    >
      <span className="tabular-nums">
        {formatDate(from)} &ndash; {formatDate(to - DAY_MS)}
      </span>
    </DateRange>
  );
}

function Intervals() {
  const { interval, setInterval } = useRange();
  return (
    <div
      role="group"
      aria-label="Lebar titik"
      className="flex items-center gap-0.5 rounded-md border bg-muted p-0.5"
    >
      {INTERVALS.map((option) => (
        <Button
          key={option.key}
          type="button"
          size="sm"
          variant={interval === option.key ? "default" : "ghost"}
          aria-pressed={interval === option.key}
          className={cn("rounded-sm", interval === option.key ? undefined : "hover:bg-background")}
          onClick={() => setInterval(option.key)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}

/**
 * One week at a time: the calendar picks the day, and the week holding it
 * becomes the period. A range that is not a week (the default 30 days, a link
 * from another page) snaps to the week it starts in.
 */
function WeekPicker() {
  const { from, to, setRange } = useRange();
  // Anchor on the end of the range: a 30-day default that ends today should
  // open on *this* week, not on the week the range started in.
  const { from: start, to: end } = weekRange(to - DAY_MS);

  useEffect(() => {
    if (from !== start || to !== end) setRange(start, end);
  }, [from, to, start, end, setRange]);

  const shift = (weeks: number) => {
    const next = weekRange(start + weeks * 7 * DAY_MS);
    setRange(next.from, next.to);
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-label="Minggu sebelumnya"
        onClick={() => shift(-1)}
      >
        <ChevronLeft className="size-5" />
      </Button>
      <Calendar
        time={start}
        setTime={(time) => {
          const next = weekRange(time);
          setRange(next.from, next.to);
        }}
        className="w-fit justify-center text-sm"
      >
        <span className="tabular-nums">
          {formatDate(start)} &ndash; {formatDate(end - DAY_MS)}
        </span>
      </Calendar>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-label="Minggu berikutnya"
        onClick={() => shift(1)}
      >
        <ChevronRight className="size-5" />
      </Button>
    </div>
  );
}
