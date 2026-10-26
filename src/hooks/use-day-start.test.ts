import { describe, expect, spyOn, test } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import { Temporal } from "temporal-polyfill";
import { tz } from "~/lib/constants";
import { currentDayStart, untilNextMidnight, useDayStart } from "./use-day-start";

/** A fixed instant, so the assertions do not depend on when the suite runs. */
function at(iso: string): number {
  return Temporal.Instant.from(iso).epochMilliseconds;
}

function zoned(milliseconds: number) {
  return Temporal.Instant.fromEpochMilliseconds(milliseconds).toZonedDateTimeISO(tz);
}

describe("currentDayStart", () => {
  test("is the local midnight of the day it is now, whatever the zone", () => {
    const instant = at("2026-03-10T15:30:00Z");
    const start = currentDayStart(instant);

    expect(zoned(start).hour).toBe(0);
    expect(zoned(start).minute).toBe(0);
    // The day starts at or before the instant and runs less than a day.
    expect(start).toBeLessThanOrEqual(instant);
    expect(instant - start).toBeLessThan(24 * 60 * 60 * 1000);
  });

  test("rolls over on its own once the next local midnight passes", () => {
    const start = currentDayStart(at("2026-03-10T15:30:00Z"));
    const next = currentDayStart(start + 24 * 60 * 60 * 1000);

    expect(next).toBeGreaterThan(start);
    expect(zoned(next).hour).toBe(0);
  });
});

describe("untilNextMidnight", () => {
  test("waits exactly until the next local midnight", () => {
    const dayStart = currentDayStart(at("2026-03-10T15:30:00Z"));
    const elevenAtNight = dayStart + 23 * 60 * 60 * 1000;
    const clock = spyOn(Date, "now").mockReturnValue(elevenAtNight);

    try {
      const wait = untilNextMidnight(dayStart);
      // Landing on the wait must read as local midnight.
      expect(zoned(elevenAtNight + wait).hour).toBe(0);
      expect(wait).toBeLessThanOrEqual(60 * 60 * 1000);
      expect(wait).toBeGreaterThan(0);
    } finally {
      clock.mockRestore();
    }
  });

  test("never returns a negative wait when the clock jumped backwards", () => {
    const dayStart = currentDayStart(at("2026-03-10T15:30:00Z"));
    const clock = spyOn(Date, "now").mockReturnValue(dayStart + 5 * 24 * 60 * 60 * 1000);

    try {
      expect(untilNextMidnight(dayStart)).toBe(60_000);
    } finally {
      clock.mockRestore();
    }
  });
});

describe("useDayStart", () => {
  // A shop PC is never closed, so the boundary has to move without a reload.
  const day1 = at("2026-03-10T15:30:00Z");
  const day2 = day1 + 24 * 60 * 60 * 1000;

  function harness(now: number) {
    const clock = spyOn(Date, "now").mockReturnValue(now);
    const view = renderHook(() => useDayStart());
    return { view, clock };
  }

  test("renders today's local midnight", () => {
    const { view, clock } = harness(day1);
    try {
      expect(view.result.current).toBe(currentDayStart(day1));
    } finally {
      clock.mockRestore();
    }
  });

  test("a window focus after midnight moves the boundary", () => {
    const { view, clock } = harness(day1);
    try {
      clock.mockReturnValue(day2);

      act(() => {
        window.dispatchEvent(new Event("focus"));
      });

      expect(view.result.current).toBe(currentDayStart(day2));
      expect(view.result.current).toBeGreaterThan(currentDayStart(day1));
    } finally {
      clock.mockRestore();
    }
  });

  test("waking the window (visibilitychange) moves it too", () => {
    // A sleeping machine fires no focus when it wakes into a new day.
    const { view, clock } = harness(day1);
    try {
      clock.mockReturnValue(day2);

      act(() => {
        document.dispatchEvent(new Event("visibilitychange"));
      });

      expect(view.result.current).toBe(currentDayStart(day2));
    } finally {
      clock.mockRestore();
    }
  });

  test("a focus on the same day keeps the same value", () => {
    const { view, clock } = harness(day1);
    try {
      const before = view.result.current;

      act(() => {
        window.dispatchEvent(new Event("focus"));
      });

      expect(view.result.current).toBe(before);
    } finally {
      clock.mockRestore();
    }
  });
});
