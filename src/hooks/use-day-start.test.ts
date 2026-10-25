import { describe, expect, spyOn, test } from "bun:test";
import { Temporal } from "temporal-polyfill";
import { tz } from "~/lib/constants";
import { currentDayStart, untilNextMidnight } from "./use-day-start";

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
