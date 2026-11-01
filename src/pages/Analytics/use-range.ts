import { useCallback, useMemo } from "react";
import { useSearchParams } from "~/services/route/react";
import { Temporal } from "temporal-polyfill";
import { tz } from "~/lib/constants";

/** How wide each point on the charts is. */
export type Interval = "day" | "week" | "month";

export type Preset = "today" | "7d" | "30d" | "90d" | "month" | "year";

/** Pressed-button order. `today` is only offered where it is a real question. */
export const PRESETS: { key: Preset; label: string }[] = [
  { key: "today", label: "Hari ini" },
  { key: "7d", label: "7 hari" },
  { key: "30d", label: "30 hari" },
  { key: "90d", label: "90 hari" },
  { key: "month", label: "Bulan ini" },
  { key: "year", label: "Tahun ini" },
];

export const INTERVALS: { key: Interval; label: string }[] = [
  { key: "day", label: "Hari" },
  { key: "week", label: "Minggu" },
  { key: "month", label: "Bulan" },
];

export const DAY_MS = 86_400_000;

/** The four keys that name the period, in the order a link writes them. */
const RANGE_KEYS = ["from", "to", "preset", "interval"] as const;

/**
 * The period as a query string, for a link that must not reset it.
 *
 * The rail's leaves are five faces of one screen, and the period belongs to the
 * screen rather than to a face — so switching faces carries it across instead of
 * starting over at the default 30 days. Only the range keys travel: a sub-page's
 * own query stays on that sub-page.
 */
export function rangeQuery(search: string): string {
  const current = new URLSearchParams(search);
  const next = new URLSearchParams();
  for (const key of RANGE_KEYS) {
    const value = current.get(key);
    if (value !== null) next.set(key, value);
  }
  const query = next.toString();
  return query === "" ? "" : `?${query}`;
}

/** Monday 00:00 of the week that holds `at`, in the shop's timezone. */
function startOfWeek(at: number): number {
  const date = Temporal.Instant.fromEpochMilliseconds(at).toZonedDateTimeISO(tz).startOfDay();
  return date.subtract(Temporal.Duration.from({ days: date.dayOfWeek - 1 })).epochMilliseconds;
}

/** The week (Monday..next Monday, `to` exclusive) that holds `at`. */
export function weekRange(anchor: number): { from: number; to: number } {
  const from = startOfWeek(anchor);
  const to = Temporal.Instant.fromEpochMilliseconds(from)
    .toZonedDateTimeISO(tz)
    .add(Temporal.Duration.from({ weeks: 1 })).epochMilliseconds;
  return { from, to };
}

/** Local midnight `daysAgo` days before today, as epoch ms. */
function dayStart(daysAgo = 0): number {
  return Temporal.Now.zonedDateTimeISO(tz)
    .startOfDay()
    .subtract(Temporal.Duration.from({ days: daysAgo })).epochMilliseconds;
}

function rangeFor(preset: Preset): { from: number; to: number } {
  const today = Temporal.Now.zonedDateTimeISO(tz).startOfDay();
  switch (preset) {
    case "today":
      return { from: today.epochMilliseconds, to: today.add({ days: 1 }).epochMilliseconds };
    case "7d":
      return { from: dayStart(6), to: today.add({ days: 1 }).epochMilliseconds };
    case "90d":
      return { from: dayStart(89), to: today.add({ days: 1 }).epochMilliseconds };
    case "month": {
      const start = today.with({ day: 1 });
      return {
        from: start.epochMilliseconds,
        to: start.add({ months: 1 }).epochMilliseconds,
      };
    }
    case "year": {
      const start = today.with({ month: 1, day: 1 });
      return {
        from: start.epochMilliseconds,
        to: start.add({ years: 1 }).epochMilliseconds,
      };
    }
    case "30d":
    default:
      return { from: dayStart(29), to: today.add({ days: 1 }).epochMilliseconds };
  }
}

function oneOf<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return value !== null && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

/**
 * The period every analytics page reads, in the URL so a sub-page switch keeps
 * it and a refresh restores it. A preset writes `from`/`to` and names itself; a
 * hand-picked range (the date picker, a week) writes the same two bounds and
 * leaves `preset` out, so no preset button reads as pressed.
 */
export function useRange() {
  const [params, setParams] = useSearchParams();
  // Memoised: `rangeFor` reads the clock, and an unmemoised default would give
  // `useQuery` new deps on every render — a refetch loop.
  const defaults = useMemo(() => rangeFor("30d"), []);
  const from = Number(params.get("from")) || defaults.from;
  const to = Number(params.get("to")) || defaults.to;
  const interval = oneOf(params.get("interval"), ["day", "week", "month"], "day");
  const raw = params.get("preset");
  const preset = PRESETS.some((option) => option.key === raw) ? (raw as Preset) : null;

  // Every setter is `useCallback`-stable. Callers put them in effect deps
  // (`WeekPicker` snaps a loose range to its week), and a fresh closure each
  // render made that effect re-run on every render — one of the two loops that
  // froze this route.
  const write = useCallback(
    (next: { from: number; to: number; preset?: Preset; interval?: Interval }) => {
      setParams(
        (old) => {
          const s = new URLSearchParams(old);
          s.set("from", String(next.from));
          s.set("to", String(next.to));
          if (next.preset === undefined) s.delete("preset");
          else s.set("preset", next.preset);
          if (next.interval !== undefined) s.set("interval", next.interval);
          return s;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  // A year at one bucket per day is 365 points; a year reads better by month.
  const setPreset = useCallback(
    (next: Preset) =>
      write({ ...rangeFor(next), preset: next, interval: next === "year" ? "month" : "day" }),
    [write],
  );
  const setInterval = useCallback(
    (next: Interval) => write({ from, to, preset: preset ?? undefined, interval: next }),
    [write, from, to, preset],
  );
  /** A hand-picked period: `to` is exclusive, as everywhere else on these pages. */
  const setRange = useCallback(
    (nextFrom: number, nextTo: number) =>
      write({ from: nextFrom, to: nextTo, interval }),
    [write, interval],
  );

  return { from, to, interval, preset, setPreset, setInterval, setRange } as const;
}
