import { useEffect, useState } from "react";
import { Temporal } from "temporal-polyfill";
import { tz } from "~/lib/constants";

/**
 * Local midnight of the day `now` (default: right now) falls in, in epoch
 * milliseconds. The instant is a parameter so the roll-over can be tested with
 * a fixed clock instead of waiting for midnight.
 */
export function currentDayStart(now: number = Date.now()): number {
  return Temporal.Instant.fromEpochMilliseconds(now)
    .toZonedDateTimeISO(tz)
    .startOfDay().epochMilliseconds;
}

/** Milliseconds from now until the next local midnight; never negative. */
export function untilNextMidnight(dayStart: number): number {
  const next = Temporal.Instant.fromEpochMilliseconds(dayStart)
    .toZonedDateTimeISO(tz)
    .add({ days: 1 });
  const wait = next.epochMilliseconds - Date.now();
  // A clock jump can leave the target in the past; retry sooner than never.
  return wait > 0 ? wait : 60_000;
}

/**
 * Today's local midnight, re-armed at the next local midnight and whenever the
 * window is focused or shown again.
 *
 * A shop PC is never closed, so a date boundary computed once at mount keeps
 * reporting yesterday's takings as "Pendapatan Hari Ini" for as long as the app
 * stays open. One timer to the next midnight — no `setInterval` polling — plus
 * the focus/visibility events that fire when a sleeping machine wakes up.
 */
export function useDayStart(): number {
  const [dayStart, setDayStart] = useState(currentDayStart);

  useEffect(() => {
    function refresh() {
      const next = currentDayStart();
      setDayStart((current) => (current === next ? current : next));
    }

    const timer = setTimeout(refresh, untilNextMidnight(dayStart));
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [dayStart]);

  return dayStart;
}
