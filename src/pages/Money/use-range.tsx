import { useMemo } from "react";
import { useSearchParams } from "react-router";
import { Temporal } from "temporal-polyfill";
import { tz } from "~/lib/constants";
import { integer } from "~/lib/utils";

export type SearchRange = {
  /** First day of the range, local midnight. */
  start: number;
  /** Last day of the range, local midnight — the day the picker shows. */
  end: number;
  /** Exclusive upper bound for queries: the midnight after `end`. */
  endExclusive: number;
  /** The picker's pair. */
  range: [number, number];
  setRange: (start: number, end: number) => void;
};

/**
 * The `start`/`end` params, defaulting to the last month. Both bounds are
 * derived here because they are two views of the same range: the picker wants
 * the chosen day, queries want it exclusive.
 */
export function useRange(): SearchRange {
  const [search, setSearch] = useSearchParams();
  const defaults = useMemo(() => {
    const today = Temporal.Now.zonedDateTimeISO(tz).startOfDay();
    return {
      start: today.subtract({ months: 1 }).epochMilliseconds,
      end: today.epochMilliseconds,
    };
  }, []);

  const start = integer.catch(defaults.start).parse(search.get("start"));
  const end = integer.catch(defaults.end).parse(search.get("end"));
  const endExclusive = Temporal.Instant.fromEpochMilliseconds(end)
    .toZonedDateTimeISO(tz)
    .add({ days: 1 }).epochMilliseconds;

  function setRange(nextStart: number, nextEnd: number) {
    setSearch((old) => {
      const next = new URLSearchParams(old);
      next.set("start", nextStart.toString());
      next.set("end", nextEnd.toString());
      return next;
    });
  }

  return { start, end, endExclusive, range: [start, end], setRange };
}
