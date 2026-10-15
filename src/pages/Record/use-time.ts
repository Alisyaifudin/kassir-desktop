import { useSearchParams } from "react-router";
import { Temporal } from "temporal-polyfill";
import { tz } from "~/lib/constants";

/** Sanity bounds for a `time` param; anything outside falls back to today. */
const EARLIEST = Temporal.ZonedDateTime.from({
  timeZone: tz,
  year: 1900,
  month: 1,
  day: 1,
}).epochMilliseconds;
const FURTHEST = Temporal.ZonedDateTime.from({
  timeZone: tz,
  year: 2101,
  month: 1,
  day: 1,
}).epochMilliseconds;

export type Day = {
  /** Local midnight of the chosen day. */
  time: number;
  yesterday: number;
  tomorrow: number;
  /** Half-open `[start, end)` spanning the chosen local day. */
  start: number;
  end: number;
};

function getDay(search: URLSearchParams): Day {
  const raw = search.get("time");
  const parsed = raw === null ? Number.NaN : Number(raw);
  const inRange = Number.isFinite(parsed) && parsed >= EARLIEST && parsed <= FURTHEST;
  const day = inRange
    ? Temporal.Instant.fromEpochMilliseconds(parsed).toZonedDateTimeISO(tz).startOfDay()
    : Temporal.Now.zonedDateTimeISO(tz).startOfDay();
  return {
    time: day.epochMilliseconds,
    yesterday: day.subtract({ days: 1 }).epochMilliseconds,
    tomorrow: day.add({ days: 1 }).epochMilliseconds,
    start: day.epochMilliseconds,
    end: day.add({ days: 1 }).epochMilliseconds,
  };
}

export function useTime() {
  const [search, setSearch] = useSearchParams();
  const day = getDay(search);
  function setTime(time: number) {
    setSearch((old) => {
      const next = new URLSearchParams(old);
      // The selection belongs to the day it was picked in, so it goes with the
      // day — same navigation, so the right pane never shows a record from the
      // day we just left. A re-pick of the same day leaves it alone.
      if (time !== day.time) {
        next.delete("selected");
      }
      next.set("time", time.toString());
      return next;
    });
  }
  return [day, setTime] as const;
}
