/**
 * Behaviour checks for the extras table's money formatting and running column.
 *
 * Run with:  bun test src/pages/Record/z-Detail/extras.test.ts
 */
import { describe, expect, test } from "bun:test";
import type { RecordExtra, RecordFull } from "~/services/record";
import { extraAmount, extrasRunningTotals, rupiah } from "./extras";

const extra = (name: string, value: number, eff: number, kind: "number" | "percent"): RecordExtra =>
  ({ id: name, name, value, eff, kind }) as unknown as RecordExtra;

const record = (
  subTotal: number,
  total: number,
  fix: number,
  extras: RecordExtra[],
): RecordFull => ({ subTotal, total, fix, extras }) as unknown as RecordFull;

describe("rupiah", () => {
  test("leads with the sign, so a discount reads -Rp5.000", () => {
    expect(rupiah(5000, 0)).toBe("Rp5.000");
    expect(rupiah(-5000, 0)).toBe("-Rp5.000");
    expect(rupiah(0, 0)).toBe("Rp0");
  });

  test("rounds to the record's own precision", () => {
    // 1,840 stored extras carry more decimals than their record's `fix`
    expect(rupiah(1492152.94272, 0)).toBe("Rp1.492.153");
    expect(rupiah(695432.4399, 2)).toBe("Rp695.432,44");
  });
});

describe("extraAmount", () => {
  test("a percentage extra shows the money and the rate it came from", () => {
    expect(extraAmount(extra("PPN", 11, 354000.24, "percent"), 0)).toBe("Rp354.000 (11%)");
  });

  test("a flat extra is just money", () => {
    expect(extraAmount(extra("Ongkir", 10000, 10000, "number"), 0)).toBe("Rp10.000");
    expect(extraAmount(extra("Diskon", -1000, -1000, "number"), 0)).toBe("-Rp1.000");
  });
});

describe("extrasRunningTotals", () => {
  test("accumulates one extra at a time, anchored on the total", () => {
    const r = record(
      5187750,
      5768403,
      0,
      [extra("PPN", 11, 570653.24, "percent"), extra("Bea Materai", 10000, 10000, "number")],
    );
    // Steps back from the total by each extra's own amount. These two strings are
    // what the real database produced for this record.
    expect(extrasRunningTotals(r).map((v) => rupiah(v, r.fix))).toEqual([
      "Rp5.758.403",
      "Rp5.768.403",
    ]);
  });

  test("a negative extra pulls the running total down", () => {
    const r = record(151956, 160238, 0, [
      extra("Diskon", -7598, -7598.4, "number"),
      extra("PPN", 11, 15879.4, "percent"),
    ]);
    expect(extrasRunningTotals(r).map((v) => rupiah(v, r.fix))).toEqual([
      "Rp144.359",
      "Rp160.238",
    ]);
  });

  test("the last row lands on the record's total even when summing forward would miss", () => {
    // Real shape from the database: the stored subtotal and total disagree with
    // the extras by a fraction of a rupiah, and rounding the forward sum from the
    // subtotal tips it one rupiah above the total the footer shows.
    const r = record(2364609, 2624715, 0, [extra("PPN", 11, 260106.5, "percent")]);
    const running = extrasRunningTotals(r);
    expect(Math.max(...running)).toBe(2624715);
    expect(running[running.length - 1]).toBe(2624715);
    expect(rupiah(running[0], r.fix)).toBe(rupiah(r.total, r.fix));
  });

  test("every step is exactly its own extra", () => {
    const extras = [
      extra("Ongkir", 10000, 10000, "number"),
      extra("PPN", 11, 354000.24, "percent"),
      extra("Diskon", -5000, -5000, "number"),
    ];
    const running = extrasRunningTotals(record(3218184, 3577184.24, 2, extras));
    for (let i = 1; i < running.length; i++) {
      expect(running[i] - running[i - 1]).toBeCloseTo(extras[i].eff, 6);
    }
    expect(running[running.length - 1]).toBeCloseTo(3577184.24, 6);
  });

  test("no extras means no rows", () => {
    expect(extrasRunningTotals(record(1000, 1000, 0, []))).toEqual([]);
  });
});
