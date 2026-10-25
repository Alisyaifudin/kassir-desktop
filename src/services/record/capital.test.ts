import { describe, expect, test } from "bun:test";
import Decimal from "decimal.js";
import { allocateCapital, sameCapital } from "./capital";

const line = (overrides: Partial<{ qty: number; unit: number; price: number; discounts: number[] }> = {}) => ({
  qty: overrides.qty ?? 1,
  unit: overrides.unit ?? 1,
  price: overrides.price ?? 1000,
  discounts: (overrides.discounts ?? []).map((eff) => ({ eff })),
});

describe("allocateCapital", () => {
  test("without extras or rounding, capital is just price per pc", () => {
    const result = allocateCapital([line({ qty: 4, price: 10000 })], new Decimal(40000));
    expect(result?.[0].lineTotal.toNumber()).toBe(40000);
    expect(result?.[0].pcs).toBe(4);
    expect(result?.[0].capital.toNumber()).toBe(10000);
  });

  test("splits extras and rounding by each line's own total", () => {
    // line totals 100 and 300; grand 440 → 110 and 330
    const result = allocateCapital(
      [
        line({ qty: 1, unit: 1, price: 100 }),
        line({ qty: 3, unit: 1, price: 100 }),
      ],
      new Decimal(440),
    );
    expect(result?.map((row) => row.effTotal.toNumber())).toEqual([110, 330]);
    expect(result?.map((row) => row.capital.toNumber())).toEqual([110, 110]);
  });

  test("uses the line total after discounts", () => {
    const result = allocateCapital(
      [line({ qty: 2, price: 1000, discounts: [200] })],
      new Decimal(1800),
    );
    expect(result?.[0].lineTotal.toNumber()).toBe(1800);
    expect(result?.[0].capital.toNumber()).toBe(900);
  });

  test("converts a listing unit into pcs", () => {
    const result = allocateCapital([line({ qty: 2, unit: 3, price: 9000 })], new Decimal(18000));
    expect(result?.[0].pcs).toBe(6);
    expect(result?.[0].capital.toNumber()).toBe(3000);
  });

  test("returns null when the line totals sum to zero", () => {
    expect(allocateCapital([line({ price: 0 })], new Decimal(0))).toBeNull();
  });
});

describe("sameCapital", () => {
  test("compares at the record's precision", () => {
    expect(sameCapital(1000.004, 1000.001, 2)).toBe(true);
    expect(sameCapital(1000.006, 1000.001, 2)).toBe(false);
    expect(sameCapital(1000.4, 1000.1, 0)).toBe(true);
    expect(sameCapital(1001, 1000, 0)).toBe(false);
  });
});
