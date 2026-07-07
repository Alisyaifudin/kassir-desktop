import { Temporal } from "temporal-polyfill";
import { MONTHS } from "~/lib/date";

// ── Types ────────────────────────────────────────────────────

export type Bin = {
  start: Temporal.PlainDate;
  end: Temporal.PlainDate; // exclusive
  label: string;
};

export type DataPoint = {
  qty: number;
  bin: Bin;
};

export type DeltaFilter = "positive" | "negative";

// ── Bin Generation ───────────────────────────────────────────

export function getBins(startEpoch: number, endEpoch: number, tz: string): Bin[] {
  return autoBins(startEpoch, endEpoch, tz);
}

function dailyBins(start: number, end: number, tz: string): Bin[] {
  let cursor = Temporal.Instant.fromEpochMilliseconds(start).toZonedDateTimeISO(tz).startOfDay();
  const bins: Bin[] = [];
  while (cursor.epochMilliseconds < end) {
    const next = cursor.add(Temporal.Duration.from({ days: 1 }));
    bins.push({
      start: cursor.toPlainDate(),
      end: next.toPlainDate(),
      label: cursor.day.toString(),
    });
    cursor = next;
  }
  return bins;
}

function monthlyBinsSimple(start: number, end: number, tz: string): Bin[] {
  const t = Temporal.Instant.fromEpochMilliseconds(start).toZonedDateTimeISO(tz);
  let cursor = Temporal.ZonedDateTime.from({
    timeZone: tz,
    year: t.year,
    month: t.month,
    day: 1,
  }).startOfDay();
  const bins: Bin[] = [];
  while (cursor.epochMilliseconds < end) {
    const next = cursor.add(Temporal.Duration.from({ months: 1 }));
    bins.push({
      start: cursor.toPlainDate(),
      end: next.toPlainDate(),
      label: `${MONTHS[cursor.month - 1]} ${cursor.year}`,
    });
    cursor = next;
  }
  return bins;
}

function autoBins(start: number, end: number, tz: string): Bin[] {
  const dur = Temporal.Duration.from({ milliseconds: end - start });
  const days = dur.total("days");

  if (days <= 90) return dailyBins(start, end, tz);
  if (days <= 3 * 365) return monthlyBinsSimple(start, end, tz);
  return yearlyBins(start, end, tz);
}

function yearlyBins(start: number, end: number, tz: string): Bin[] {
  const t = Temporal.Instant.fromEpochMilliseconds(start).toZonedDateTimeISO(tz);
  let cursor = Temporal.ZonedDateTime.from({
    timeZone: tz,
    year: t.year,
    month: 1,
    day: 1,
  }).startOfDay();
  const bins: Bin[] = [];
  while (cursor.epochMilliseconds < end) {
    const next = cursor.add(Temporal.Duration.from({ years: 1 }));
    bins.push({
      start: cursor.toPlainDate(),
      end: next.toPlainDate(),
      label: `${cursor.year}`,
    });
    cursor = next;
  }
  return bins;
}

// ── Filter & Aggregate ───────────────────────────────────────

function toEpoch(d: Temporal.PlainDate, tz: string): number {
  return d.toZonedDateTime({ timeZone: tz, plainTime: "00:00" }).epochMilliseconds;
}

export function filterAndAggregate(
  events: { timestamp: number; value: number }[],
  bins: Bin[],
  startEpoch: number,
  endEpoch: number,
  delta: DeltaFilter,
  tz: string,
): DataPoint[] {
  const inRange = events.filter((e) => e.timestamp >= startEpoch && e.timestamp < endEpoch);
  const bySign =
    delta === "positive" ? inRange.filter((e) => e.value > 0) : inRange.filter((e) => e.value < 0);

  return bins.map((b) => {
    const bStart = toEpoch(b.start, tz);
    const bEnd = toEpoch(b.end, tz);
    const matched = bySign.filter((e) => e.timestamp >= bStart && e.timestamp < bEnd);
    const qty = matched.reduce((sum, e) => sum + Math.abs(e.value), 0);
    return { qty, bin: b };
  });
}
