import { useSearchParams } from "react-router";
import { Temporal } from "temporal-polyfill";
import { z } from "zod";
import { useCallback } from "react";

// ── Types ────────────────────────────────────────────────────

export type Preset = "30d" | "thisYear" | "1y" | "all" | "custom";

// ── Zod schemas ──────────────────────────────────────────────

const presetSchema = z.enum(["30d", "thisYear", "1y", "all", "custom"]);
const msSchema = z.coerce.number().int().catch(Date.now());

// ── usePreset ────────────────────────────────────────────────

export function usePreset(): { preset: Preset; setPreset: (p: Preset) => void } {
  const [search, setSearch] = useSearchParams();
  const preset = presetSchema.catch("30d").parse(search.get("preset"));

  const setPreset = useCallback(
    (p: Preset) => {
      setSearch((old) => {
        const s = new URLSearchParams(old);
        s.set("preset", p);
        if (p !== "custom") {
          s.delete("start");
          s.delete("end");
        }
        return s;
      });
    },
    [setSearch],
  );

  return { preset, setPreset };
}

// ── useCustomRange ───────────────────────────────────────────

export function useCustomRange(): {
  customStart: number;
  customEnd: number;
  setCustomRange: (r: [Temporal.PlainDate, Temporal.PlainDate], tz: string) => void;
} {
  const [search, setSearch] = useSearchParams();

  const customStart = msSchema.parse(search.get("start"));
  const customEnd = msSchema.parse(search.get("end"));

  const setCustomRange = useCallback(
    ([from, to]: [Temporal.PlainDate, Temporal.PlainDate], tz: string) => {
      const s = from.toZonedDateTime({ timeZone: tz, plainTime: "00:00" }).epochMilliseconds;
      const e = to.toZonedDateTime({ timeZone: tz, plainTime: "23:59:59.999" }).epochMilliseconds;
      setSearch((old) => {
        const params = new URLSearchParams(old);
        params.set("preset", "custom");
        params.set("start", Math.min(s, e).toString());
        params.set("end", Math.max(s, e).toString());
        return params;
      });
    },
    [setSearch],
  );

  return { customStart, customEnd, setCustomRange };
}

// ── Range computation (needs DateService deps) ───────────────

export function computeRange(
  preset: Preset,
  customStart: number,
  customEnd: number,
  deps: { now: () => number; todayDate: () => Temporal.PlainDate; timeZoneId: () => string },
): [number, number] {
  const tz = deps.timeZoneId();
  const td = deps.todayDate();
  const n = deps.now();

  switch (preset) {
    case "30d":
      return [
        td.subtract({ days: 30 }).toZonedDateTime({ timeZone: tz, plainTime: "00:00" }).epochMilliseconds,
        n,
      ];
    case "thisYear":
      return [
        Temporal.PlainDate.from({ year: td.year, month: 1, day: 1 })
          .toZonedDateTime({ timeZone: tz, plainTime: "00:00" })
          .epochMilliseconds,
        n,
      ];
    case "1y":
      return [
        td.subtract({ days: 365 }).toZonedDateTime({ timeZone: tz, plainTime: "00:00" }).epochMilliseconds,
        n,
      ];
    case "all":
      return [0, 4099680000000];
    case "custom":
      return [Math.min(customStart, customEnd), Math.max(customStart, customEnd)];
  }
}

// ── Convert epoch ms to Temporal.PlainDate ───────────────────

export function epochToPlainDate(epoch: number, tz: string): Temporal.PlainDate {
  return Temporal.Instant.fromEpochMilliseconds(epoch).toZonedDateTimeISO(tz).toPlainDate();
}
