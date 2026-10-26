import { describe, expect, test } from "bun:test";
import { roundToFix } from "./round";

/**
 * `fix` is the record's money precision (`record_fix`), set per record by whoever
 * rang it up. The service and the detail pane share this one function so the
 * table and the printed total cannot disagree by a rounding step.
 */
describe("roundToFix", () => {
  test("rounds to the record's decimal places", () => {
    expect(roundToFix(1234.5678, 2)).toBe(1234.57);
    expect(roundToFix(1234.5, 0)).toBe(1235);
    expect(roundToFix(1234.5, 1)).toBe(1234.5);
  });

  test("a half-step goes the way `toFixed` goes, so the receipt matches the sum", () => {
    expect(roundToFix(0.5, 0)).toBe(1);
    expect(roundToFix(1.005, 2)).toBe(1);
  });

  test("a stored `fix` that is not a small whole number counts as zero digits", () => {
    // `record_fix` is INTEGER NOT NULL in SQLite, but a hand-edited backup can
    // still carry anything; a negative or fractional digit count is not a crash.
    for (const fix of [-1, 1.5, 101, Number.NaN]) {
      expect(roundToFix(1234.5678, fix)).toBe(1235);
    }
  });

  test("the result is a number, not a string from `toFixed`", () => {
    const rounded = roundToFix(1000, 2);
    expect(typeof rounded).toBe("number");
    expect(rounded + 1).toBe(1001);
  });

  test("accumulated float noise collapses to the typed amount", () => {
    expect(roundToFix(0.1 + 0.2, 2)).toBe(0.3);
    expect(roundToFix(0.1 + 0.2, 0)).toBe(0);
  });
});
