import { Temporal } from "temporal-polyfill";
import { tz } from "~/lib/constants";
import { monthNames } from "~/lib/date";
import type { DailyStat, MarginStat } from "~/services/analytics";
import type { Interval } from "./use-range";

/**
 * One point on the time charts: the money that moved inside a local day, week
 * or month. `margin`/`costed` only count lines that stored a cost, so an empty
 * `costed` means "no cost data in this bucket", not "zero profit".
 */
type Bucket = {
  start: number;
  label: string;
  omzet: number;
  pengeluaran: number;
  count: number;
  unpaid: number;
  margin: number;
  costed: number;
  /** `omzet − pengeluaran`, computed once so charts can bind to it. */
  net: number;
};

function fromDay(day: string): Temporal.ZonedDateTime {
  const [year, month, date] = day.split("-").map(Number);
  return Temporal.ZonedDateTime.from({
    timeZone: tz,
    year: year!,
    month: month!,
    day: date!,
  }).startOfDay();
}

function align(date: Temporal.ZonedDateTime, interval: Interval): Temporal.ZonedDateTime {
  switch (interval) {
    case "day":
      return date.startOfDay();
    case "week":
      return date.startOfDay().subtract({ days: date.dayOfWeek - 1 });
    case "month":
      return date.startOfDay().with({ day: 1 });
  }
}

function step(date: Temporal.ZonedDateTime, interval: Interval): Temporal.ZonedDateTime {
  switch (interval) {
    case "day":
      return date.add({ days: 1 });
    case "week":
      return date.add({ weeks: 1 });
    case "month":
      return date.add({ months: 1 });
  }
}

function labelOf(start: number, interval: Interval): string {
  const date = Temporal.Instant.fromEpochMilliseconds(start).toZonedDateTimeISO(tz);
  if (interval === "month") return `${monthNames[date.month as 1]} ${String(date.year).slice(-2)}`;
  // `22/10` rather than `22-10-2026`: half the width, still unambiguous on a
  // chart whose range is printed above it.
  return `${String(date.day).padStart(2, "0")}/${String(date.month).padStart(2, "0")}`;
}

/**
 * Rolls the service's per-day rows into the chosen interval, filling the empty
 * buckets between `from` and `to` so a gap in trading shows as a gap in the
 * chart instead of a line jumping over it.
 */
export function bucketise(
  daily: DailyStat[],
  margins: MarginStat[],
  from: number,
  to: number,
  interval: Interval,
): Bucket[] {
  const buckets = new Map<number, Bucket>();
  let cursor = align(Temporal.Instant.fromEpochMilliseconds(from).toZonedDateTimeISO(tz), interval);
  // `to` is exclusive (tomorrow's midnight); the last bucket is the day before.
  const end = align(
    Temporal.Instant.fromEpochMilliseconds(to - 1).toZonedDateTimeISO(tz),
    interval,
  );

  while (Temporal.ZonedDateTime.compare(cursor, end) <= 0) {
    const start = cursor.epochMilliseconds;
    buckets.set(start, {
      start,
      label: labelOf(start, interval),
      omzet: 0,
      pengeluaran: 0,
      count: 0,
      unpaid: 0,
      margin: 0,
      costed: 0,
      net: 0,
    });
    cursor = step(cursor, interval);
  }

  for (const row of daily) {
    const start = align(fromDay(row.day), interval).epochMilliseconds;
    const bucket = buckets.get(start);
    if (bucket === undefined) continue;
    if (row.mode === "incoming") {
      bucket.omzet += row.total;
      bucket.unpaid += row.unpaid;
    } else {
      bucket.pengeluaran += row.total;
    }
    bucket.count += row.count;
  }

  for (const row of margins) {
    const start = align(fromDay(row.day), interval).epochMilliseconds;
    const bucket = buckets.get(start);
    if (bucket === undefined) continue;
    bucket.margin += row.margin;
    bucket.costed += row.costed;
  }

  const rows = [...buckets.values()];
  for (const row of rows) row.net = row.omzet - row.pengeluaran;
  return rows;
}
