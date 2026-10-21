/**
 * Guards the two URL/form numeric helpers, which five parsers trust.
 *
 * Both were written with `||` instead of `&&`, so the "must be a number / a
 * whole number" rule was unreachable: `integer.parse("abc")` succeeded and
 * produced `NaN` (`?page=abc` → empty table, `NaN/NaN` footer) and
 * `numerish.parse("")` produced `0`. The range hooks below are the two call
 * sites where that used to crash: `Temporal.Instant.fromEpochMilliseconds(3.7)`
 * throws a `RangeError` during render.
 *
 * Run with:  bun test src/lib/utils.test.ts
 */
import { describe, expect, test } from "bun:test";
import { integer, numeric } from "./utils";
import { EARLIEST_EPOCH, FURTHEST_EPOCH, parseRange } from "./range";

function params(entries: Record<string, string>): { get(key: string): string | null } {
  return { get: (key) => entries[key] ?? null };
}

describe("integer", () => {
  test.each(["abc", "3.7", "", "NaN", "Infinity", "1e999", "  "])("%p is rejected", (raw) => {
    expect(integer.safeParse(raw).success).toBe(false);
  });

  test.each([
    ["42", 42],
    ["-1", -1],
    ["0", 0],
    [" 7 ", 7],
  ])("%p becomes %d", (raw, expected) => {
    expect(integer.parse(raw)).toBe(expected);
  });

  test("catch() falls back when the value is not a whole number", () => {
    expect(integer.catch(1).parse("abc")).toBe(1);
    expect(integer.catch(1).parse("3.7")).toBe(1);
  });
});

describe("numerish", () => {
  test("rejects the empty string instead of reading it as zero", () => {
    expect(numeric.safeParse("").success).toBe(false);
  });

  test("rejects a non-numeric string", () => {
    expect(numeric.safeParse("abc").success).toBe(false);
  });

  test("keeps decimals and negatives", () => {
    expect(numeric.parse("68000.5")).toBe(68000.5);
    expect(numeric.parse("-2")).toBe(-2);
  });
});

describe("parseRange", () => {
  const defaults = { start: EARLIEST_EPOCH + 1000, end: FURTHEST_EPOCH - 1000 };

  test("uses the URL values when they are valid epoch millis", () => {
    const raw = { start: `${EARLIEST_EPOCH + 5000}`, end: `${FURTHEST_EPOCH - 5000}` };
    expect(parseRange(params(raw), defaults)).toEqual({
      start: EARLIEST_EPOCH + 5000,
      end: FURTHEST_EPOCH - 5000,
    });
  });

  test.each([
    { start: "abc", end: "abc" },
    { start: "3.7", end: "3.7" },
    { start: "", end: "" },
    // Outside `Temporal.Instant`'s range: these are what used to throw.
    { start: `${Number.MAX_SAFE_INTEGER}`, end: `${Number.MAX_SAFE_INTEGER}` },
    { start: "-99999999999999", end: "-99999999999999" },
  ])("falls back per bound for %p", (raw) => {
    expect(parseRange(params(raw), defaults)).toEqual(defaults);
  });

  test("a missing param falls back too", () => {
    expect(parseRange(params({}), defaults)).toEqual(defaults);
  });
});
