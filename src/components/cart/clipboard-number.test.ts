import { describe, expect, test } from "bun:test";
import { parseClipboardNumber } from "./clipboard-number";

/**
 * A pasted number has to be read the way it was written.
 *
 * Copies out of the grid are English (`String(price)`, so `20000.2`); display
 * strings are Indonesian (`Rp20.000,2`). The old digits-only read collapsed both
 * to `200002` and `200002` — see the "200.002" bug this pins.
 */
describe("parseClipboardNumber", () => {
  test("an English copy with a decimal point", () => {
    expect(parseClipboardNumber("20000.2")).toBe(20000.2);
    expect(parseClipboardNumber("12000.35")).toBe(12000.35);
    expect(parseClipboardNumber("1234")).toBe(1234);
    expect(parseClipboardNumber("-5.5")).toBe(-5.5);
  });

  test("an Indonesian display string", () => {
    expect(parseClipboardNumber("Rp12.500")).toBe(12_500);
    expect(parseClipboardNumber("Rp20.000,2")).toBe(20_000.2);
    expect(parseClipboardNumber("20.000,25")).toBe(20_000.25);
    expect(parseClipboardNumber("rp 1.234.567")).toBe(1_234_567);
  });

  test("a comma decimal, as typed in Indonesian", () => {
    expect(parseClipboardNumber("10,5")).toBe(10.5);
    expect(parseClipboardNumber("0,75")).toBe(0.75);
  });

  test("both separators, whichever came last is the decimal point", () => {
    expect(parseClipboardNumber("1.234,56")).toBe(1234.56);
    expect(parseClipboardNumber("1,234.56")).toBe(1234.56);
  });

  test("English grouping reads as grouping, not a small decimal", () => {
    expect(parseClipboardNumber("20,000")).toBe(20_000);
    expect(parseClipboardNumber("1.234.567")).toBe(1_234_567);
  });

  test("a big whole part keeps a single dot as the decimal point", () => {
    // `20000.123` is an English price with three decimals, not 20 000 123.
    expect(parseClipboardNumber("20000.123")).toBe(20000.123);
  });

  test("no number in the text answers null", () => {
    expect(parseClipboardNumber("")).toBeNull();
    expect(parseClipboardNumber("   ")).toBeNull();
    expect(parseClipboardNumber("abc")).toBeNull();
    expect(parseClipboardNumber("12 pcs")).toBeNull();
    expect(parseClipboardNumber("Rp")).toBeNull();
  });
});
