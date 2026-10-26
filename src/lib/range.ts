import { Temporal } from "temporal-polyfill";
import { tz } from "./constants";
import { integer } from "./utils";

/**
 * Sanity bounds for an epoch-millis URL param. `Temporal.Instant` throws a
 * `RangeError` outside roughly ±8.64e15 ms, and a `RangeError` thrown during
 * render lands in the route error boundary — so a hand-edited `?start=` must be
 * rejected here, not there. 1900–2101 is the same window `Record/use-time.ts`
 * uses for `?time=`.
 */
export const EARLIEST_EPOCH = Temporal.ZonedDateTime.from({
  timeZone: tz,
  year: 1900,
  month: 1,
  day: 1,
}).epochMilliseconds;
export const FURTHEST_EPOCH = Temporal.ZonedDateTime.from({
  timeZone: tz,
  year: 2101,
  month: 1,
  day: 1,
}).epochMilliseconds;

type RangeBounds = { start: number; end: number };

function parseBound(raw: string | null, fallback: number): number {
  const parsed = integer.catch(fallback).safeParse(raw);
  if (!parsed.success) return fallback;
  const value = parsed.data;
  if (value < EARLIEST_EPOCH || value > FURTHEST_EPOCH) return fallback;
  return value;
}

/**
 * Read `?start=`/`?end=` epoch millis, falling back per-bound to `defaults`.
 *
 * Extracted from the two `use-range` hooks (Records search and Money) so it can
 * be tested without a router: the same parse is what turns a stale link into an
 * empty list or a crash.
 */
export function parseRange(
  search: { get(key: string): string | null },
  defaults: RangeBounds,
): RangeBounds {
  return {
    start: parseBound(search.get("start"), defaults.start),
    end: parseBound(search.get("end"), defaults.end),
  };
}
