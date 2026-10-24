import { describe, expect, test } from "bun:test";
import type { Discount } from "~/services/record";
import { discountLabel, discountTotals } from "./discounts";

const discounts: Discount[] = [
  { id: "1", kind: "percent", value: 10, eff: 100 },
  { id: "2", kind: "number", value: 50, eff: 50 },
  { id: "3", kind: "pcs", value: 1, eff: 25 },
];

describe("record-line discounts", () => {
  test("shows the running total after each discount", () => {
    expect(discountTotals(100, 2, discounts)).toEqual([100, 50, 25]);
  });

  test("labels the three discount kinds as on the receipt", () => {
    expect(discounts.map(discountLabel)).toEqual(["Diskon 10%", "Diskon", "Diskon 1pcs"]);
  });
});
