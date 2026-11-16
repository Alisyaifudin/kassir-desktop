import { Temporal } from "temporal-polyfill";
import { tz } from "~/lib/constants";
import { MONTHS, monthNames } from "~/lib/date";

/**
 * The spans a report is asked for, and the arithmetic that turns any instant into
 * the one it falls in.
 *
 * Every range is **half-open `[start, end)` in local midnights**, which is the
 * shape `analytics/scope.sql` binds (`>= $1 AND < $2`) and the shape `useTime`
 * already produces for a day. Nothing here reads a clock: an anchor instant comes
 * in and a range goes out, so the whole module is testable at any date the
 * operator could pick.
 *
 * The zone is a parameter (defaulting to the machine's, like the rest of the app)
 * for one reason: it is the only way to *prove* the DST behaviour. Indonesia has
 * no DST, but the machine's zone is whatever the OS says, and the arithmetic below
 * is calendar-based (`add({ days: 1 })`, never `+ 86_400_000`) precisely so that a
 * 23- or 25-hour day does not shift a report by one. A test in a DST zone is what
 * keeps that true.
 */
export type PeriodKind = "day" | "week" | "month" | "quarter" | "year";

/** Half-open range of local midnights, in epoch milliseconds. */
export type Range = { start: number; end: number };

/** Display order, and the order the period tabs use. */
export const PERIOD_KINDS: readonly PeriodKind[] = [
  "day",
  "week",
  "month",
  "quarter",
  "year",
];

export function isPeriodKind(value: string | null | undefined): value is PeriodKind {
  return PERIOD_KINDS.includes(value as PeriodKind);
}

/** The wall clock reading of an instant in `zone`. */
function localOf(epoch: number, zone: string): Temporal.ZonedDateTime {
  return Temporal.Instant.fromEpochMilliseconds(epoch).toZonedDateTimeISO(zone);
}

/**
 * The first instant of the period `kind` that contains `at`.
 *
 * Each case is read from the `ZonedDateTime` rather than from an epoch offset, so
 * the answer is a calendar fact ("1 January", "the Monday of this week") and not a
 * duration. `week` starts on Monday — ISO 8601, and the week the shop counts in.
 *
 * The day is set before the month and the month before the year on purpose: a
 * partial date like `{ month: 2 }` on the 31st of a month is an invalid
 * combination, and Temporal would be asked to resolve it. Setting the coarser
 * field onto an already-normalised date cannot fail.
 */
function startOfPeriod(kind: PeriodKind, at: Temporal.ZonedDateTime): Temporal.ZonedDateTime {
  switch (kind) {
    case "day":
      return at.startOfDay();
    case "week":
      // dayOfWeek: Mon = 1 … Sun = 7, so this is the Monday of `at`'s week.
      return at.subtract({ days: at.dayOfWeek - 1 }).startOfDay();
    case "month":
      return at.with({ day: 1 }).startOfDay();
    case "quarter":
      return at
        .with({ day: 1 })
        .with({ month: Math.floor((at.month - 1) / 3) * 3 + 1 })
        .startOfDay();
    case "year":
      return at.with({ day: 1 }).with({ month: 1 }).startOfDay();
  }
}

/**
 * `delta` periods after `at`, which is expected to be the *first* instant of one.
 *
 * Calendar arithmetic, so a month is a month even when it is 28 days and even
 * when a DST jump makes it 743 hours.
 */
function advance(
  kind: PeriodKind,
  at: Temporal.ZonedDateTime,
  delta: number,
): Temporal.ZonedDateTime {
  switch (kind) {
    case "day":
      return at.add({ days: delta });
    case "week":
      return at.add({ weeks: delta });
    case "month":
      return at.add({ months: delta });
    case "quarter":
      return at.add({ months: 3 * delta });
    case "year":
      return at.add({ years: delta });
  }
}

/**
 * The half-open range of the period `anchor` falls in.
 *
 * `anchor` is any instant inside the period — a record's timestamp, the `time`
 * search param, "now" — and is assumed finite; `useTime` already refuses junk and
 * out-of-range values before anything reaches this module.
 */
export function rangeOf(kind: PeriodKind, anchor: number, zone: string = tz): Range {
  const start = startOfPeriod(kind, localOf(anchor, zone));
  return { start: start.epochMilliseconds, end: advance(kind, start, 1).epochMilliseconds };
}

/**
 * The start of the period `delta` periods away from the one `anchor` is in.
 *
 * This is what the header's `‹ ›` steppers call: pass the day (or week, or month)
 * currently shown and `±1`. `delta = 0` normalises the anchor down to its own
 * period start, which is why the result always re-derives to the same range —
 * `rangeOf(kind, step(kind, anchor, n))` and `step(kind, anchor, n)` cannot
 * disagree about which period they mean.
 */
export function step(
  kind: PeriodKind,
  anchor: number,
  delta: number,
  zone: string = tz,
): number {
  const start = startOfPeriod(kind, localOf(anchor, zone));
  return advance(kind, start, delta).epochMilliseconds;
}

/**
 * One local midnight per day in `range`, oldest first.
 *
 * Used by the `Laporan` view's day rail and by the per-day completeness check.
 * Walks with `add({ days: 1 })` rather than by adding 24 hours, so a DST day
 * yields one entry and not zero or two.
 */
export function daysOf(range: Range, zone: string = tz): number[] {
  const days: number[] = [];
  let cursor = localOf(range.start, zone);
  while (cursor.epochMilliseconds < range.end) {
    days.push(cursor.epochMilliseconds);
    cursor = cursor.add({ days: 1 });
  }
  return days;
}

/**
 * What the header prints for a range.
 *
 * Indonesian, and short, because it sits in a 48px band beside two stepper
 * buttons: `14 Maret 2026`, `9–15 Mar 2026`, `Mar 2026`, `Kuartal 1 2026`, `2026`.
 *
 * The day label is built here rather than through `formatDate` for one reason:
 * `formatDate` reads the machine's zone, and this module takes the zone as an
 * argument. A label that disagreed with the range it labels would be the worse
 * bug. The output is the same string `formatDate(start, "long")` produces.
 */
export function labelOf(kind: PeriodKind, range: Range, zone: string = tz): string {
  const from = localOf(range.start, zone);
  switch (kind) {
    case "day":
      return `${from.day} ${monthNames[from.month]} ${from.year}`;
    case "week": {
      // The last day *in* the range, not the exclusive end: a week shown as
      // "9–16 Mar" would read as eight days.
      const to = localOf(range.end, zone).subtract({ days: 1 });
      const left = `${from.day} ${MONTHS[from.month - 1]}`;
      const right = `${to.day} ${MONTHS[to.month - 1]}`;
      if (from.year !== to.year) return `${left} ${from.year} – ${right} ${to.year}`;
      if (from.month !== to.month) return `${left} – ${right} ${to.year}`;
      return `${from.day}–${to.day} ${MONTHS[to.month - 1]} ${to.year}`;
    }
    case "month":
      return `${MONTHS[from.month - 1]} ${from.year}`;
    case "quarter":
      return `Kuartal ${Math.floor((from.month - 1) / 3) + 1} ${from.year}`;
    case "year":
      return String(from.year);
  }
}
