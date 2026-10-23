import { useMemo } from "react";
import { useSearchParams } from "react-router";
import { Temporal } from "temporal-polyfill";
import { tz } from "~/lib/constants";

/** How wide each point on the charts is. */
export type Interval = "day" | "week" | "month";

export type Preset = "7d" | "30d" | "90d" | "month" | "year";

export const PRESETS: { key: Preset; label: string }[] = [
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

/** Local midnight `daysAgo` days before today, as epoch ms. */
function dayStart(daysAgo = 0): number {
  return Temporal.Now.zonedDateTimeISO(tz)
    .startOfDay()
    .subtract(Temporal.Duration.from({ days: daysAgo })).epochMilliseconds;
}

export function rangeFor(preset: Preset): { from: number; to: number } {
  const today = Temporal.Now.zonedDateTimeISO(tz).startOfDay();
  switch (preset) {
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
 * it and a refresh restores it. The presets write `from`/`to`; the custom range
 * (if one ever lands) would write them directly and leave `preset` out.
 */
export function useRange() {
  const [params, setParams] = useSearchParams();
  // Memoised: `rangeFor` reads the clock, and an unmemoised default would give
  // `useQuery` new deps on every render — a refetch loop.
  const defaults = useMemo(() => rangeFor("30d"), []);
  const from = Number(params.get("from")) || defaults.from;
  const to = Number(params.get("to")) || defaults.to;
  const interval = oneOf(params.get("interval"), ["day", "week", "month"], "day");
  const preset = (params.get("preset") as Preset | null) ?? "30d";

  const write = (next: { from: number; to: number; preset?: Preset; interval?: Interval }) => {
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
  };

  // A year at one bucket per day is 365 points; a year reads better by month.
  const setPreset = (next: Preset) =>
    write({ ...rangeFor(next), preset: next, interval: next === "year" ? "month" : "day" });
  const setInterval = (next: Interval) =>
    write({ from, to, preset: (preset as Preset) ?? undefined, interval: next });

  return { from, to, interval, preset, setPreset, setInterval } as const;
}
