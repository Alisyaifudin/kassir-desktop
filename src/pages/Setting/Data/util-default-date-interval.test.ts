import { describe, expect, test } from "bun:test";
import { Temporal } from "temporal-polyfill";
import { getDefaultInterval } from "./util-default-date-interval";

/**
 * The default range for the download panels: this month, from its first local
 * midnight to the next month's. The write is an epoch pair, and a day of drift
 * here silently drops the first entries of the month from the backup.
 */
describe("getDefaultInterval", () => {
  test("starts at local midnight on the first of this month", () => {
    const { startOfMonth } = getDefaultInterval();
    const start = Temporal.Instant.fromEpochMilliseconds(startOfMonth).toZonedDateTimeISO(
      Temporal.Now.timeZoneId(),
    );

    expect(start.day).toBe(1);
    expect(start.hour).toBe(0);
    expect(start.minute).toBe(0);
    expect(start.second).toBe(0);
    expect(start.millisecond).toBe(0);
  });

  test("ends at the first instant of the next month, so the range is half-open", () => {
    const { startOfMonth, endOfMonth } = getDefaultInterval();
    const start = Temporal.Instant.fromEpochMilliseconds(startOfMonth).toZonedDateTimeISO(
      Temporal.Now.timeZoneId(),
    );

    expect(endOfMonth).toBe(start.add({ months: 1 }).epochMilliseconds);
    expect(endOfMonth).toBeGreaterThan(startOfMonth);
  });

  test("the end is never inside the month it covers", () => {
    const { startOfMonth, endOfMonth } = getDefaultInterval();
    const today = Temporal.Now.zonedDateTimeISO();
    expect(startOfMonth).toBeLessThanOrEqual(today.epochMilliseconds);
    expect(endOfMonth).toBeGreaterThan(today.epochMilliseconds);
  });
});
