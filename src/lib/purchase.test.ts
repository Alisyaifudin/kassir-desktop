import { describe, expect, test } from "bun:test";
import Decimal from "decimal.js";
import {
  discountsEatLine,
  extrasTotal,
  lineDiscountTotal,
  lineGrandTotal,
  lineSubtotal,
  linesSubtotal,
  paidTotal,
  purchaseTotal,
  recalcDiscounts,
  recalcExtras,
  roundMoney,
  transactionGrandTotal,
  withDerivedDiscounts,
  type DiscountKind,
  type DiscountLine,
} from "./purchase";
import { roundToFix } from "~/services/record/round";

/**
 * The money core both cart screens, the receipt and the commit path share.
 *
 * The commit suite only ever exercised these functions *through* a database
 * with valid inputs, so the edges that matter — a discount larger than its
 * line, a stack that reaches zero, the rounding direction at a half — were
 * unpinned. Two real defects (a negative sale and a stale discount after a
 * price edit) live here.
 */

/** A cart row: the money fields plus the row's own id, which must survive. */
type Row = DiscountLine & { id: string };

let seq = 0;
function discount(kind: DiscountKind, value: number, id = `d-${(seq += 1)}`): Row {
  return { id, kind, value, eff: 0, total: 0 };
}

const line = <D extends DiscountLine>(
  price: number,
  qty: number,
  discounts: readonly D[] = [],
) => ({ price, qty, discounts });

describe("line totals", () => {
  test("subtotal is price × qty", () => {
    expect(lineSubtotal({ price: 10_000, qty: 4 }).toNumber()).toBe(40_000);
  });

  test("a line with no discount totals its subtotal", () => {
    expect(lineGrandTotal(line(10_000, 2)).toNumber()).toBe(20_000);
    expect(lineDiscountTotal({ discounts: [] }).toNumber()).toBe(0);
  });

  test("a percent discount takes its share of the line", () => {
    const discounts = recalcDiscounts(10_000, 2, [discount("percent", 10)]);
    expect(discounts[0]?.eff).toBe(2_000);
    expect(discounts[0]?.total).toBe(18_000);
    expect(lineGrandTotal({ price: 10_000, qty: 2, discounts }).toNumber()).toBe(18_000);
  });

  test("a pcs discount is value × price, not value × qty", () => {
    const discounts = recalcDiscounts(5_000, 3, [discount("pcs", 2)]);
    expect(discounts[0]?.eff).toBe(10_000);
    expect(lineGrandTotal({ price: 5_000, qty: 3, discounts }).toNumber()).toBe(5_000);
  });

  test("a flat number discount is the rupiah entered", () => {
    const discounts = recalcDiscounts(10_000, 4, [discount("number", 1_500)]);
    expect(discounts[0]?.eff).toBe(1_500);
    expect(lineGrandTotal({ price: 10_000, qty: 4, discounts }).toNumber()).toBe(38_500);
  });

  test("linesSubtotal adds each line's own total, after its discount", () => {
    const kopi = {
      ...line(10_000, 1),
      discounts: recalcDiscounts(10_000, 1, [discount("percent", 10)]),
    };
    const teh = line(5_000, 2);
    expect(linesSubtotal([kopi, teh]).toNumber()).toBe(19_000);
    expect(linesSubtotal([]).toNumber()).toBe(0);
  });
});

describe("recalcDiscounts", () => {
  test("a percent applies to the running total, so two 10% are not 20%", () => {
    const twoInARow = recalcDiscounts(10_000, 1, [discount("percent", 10), discount("percent", 10)]);
    expect(twoInARow.map((row) => row.eff)).toEqual([1_000, 900]);
    expect(twoInARow.map((row) => row.total)).toEqual([9_000, 8_100]);
    // ... while one 20% takes more than the stack of two 10%.
    const twenty = recalcDiscounts(10_000, 1, [discount("percent", 20)]);
    expect(twenty[0]?.eff).toBe(2_000);
  });

  test("order matters for a number followed by a percent", () => {
    const flatFirst = recalcDiscounts(10_000, 1, [
      discount("number", 1_000),
      discount("percent", 10),
    ]);
    expect(flatFirst.map((row) => row.eff)).toEqual([1_000, 900]);
    const percentFirst = recalcDiscounts(10_000, 1, [
      discount("percent", 10),
      discount("number", 1_000),
    ]);
    expect(percentFirst.map((row) => row.eff)).toEqual([1_000, 1_000]);
  });

  test("an empty stack derives nothing", () => {
    expect(recalcDiscounts(10_000, 2, [])).toEqual([]);
  });

  test("an empty row keeps the running total", () => {
    const rows = recalcDiscounts(10_000, 1, [discount("percent", 0)]);
    expect(rows[0]?.eff).toBe(0);
    expect(rows[0]?.total).toBe(10_000);
  });

  test("a number discount larger than the line takes the line and stops", () => {
    const rows = recalcDiscounts(5_000, 1, [discount("number", 999_999)]);
    expect(rows[0]?.eff).toBe(5_000);
    expect(rows[0]?.total).toBe(0);
  });

  test("a pcs discount larger than the quantity takes the line and stops", () => {
    // `pcs: 2` on a one-piece line used to be twice the line, i.e. −price.
    const rows = recalcDiscounts(5_000, 1, [discount("pcs", 2)]);
    expect(rows[0]?.eff).toBe(5_000);
    expect(rows[0]?.total).toBe(0);
  });

  test("stacked large rows never run the line below zero", () => {
    const rows = recalcDiscounts(5_000, 1, [
      discount("number", 4_000),
      discount("number", 4_000),
      discount("percent", 50),
    ]);
    expect(rows.map((row) => row.eff)).toEqual([4_000, 1_000, 0]);
    expect(rows.at(-1)?.total).toBe(0);
  });

  test("a negative value cannot add money to the line", () => {
    const rows = recalcDiscounts(5_000, 1, [discount("number", -1_000)]);
    expect(rows[0]?.eff).toBe(0);
    expect(rows[0]?.total).toBe(5_000);
  });

  test("re-derives after a price change", () => {
    const before = recalcDiscounts(10_000, 1, [discount("percent", 10)]);
    expect(before[0]?.eff).toBe(1_000);
    const after = recalcDiscounts(20_000, 1, before);
    expect(after[0]?.eff).toBe(2_000);
    expect(after[0]?.total).toBe(18_000);
  });

  test("keeps the row's own id and kind", () => {
    const rows = recalcDiscounts(10_000, 1, [discount("number", 1_000, "keep-me")]);
    expect(rows[0]?.id).toBe("keep-me");
    expect(rows[0]?.kind).toBe("number");
  });
});

describe("discountsEatLine", () => {
  test("is false without a discount", () => {
    expect(discountsEatLine(line(10_000, 1))).toBe(false);
  });

  test("is false for a discount that leaves something", () => {
    const discounts = recalcDiscounts(10_000, 1, [discount("percent", 99)]);
    expect(discountsEatLine({ ...line(10_000, 1), discounts })).toBe(false);
  });

  test("is true when the stack takes the whole line", () => {
    const discounts = recalcDiscounts(10_000, 1, [discount("percent", 100)]);
    expect(discountsEatLine({ ...line(10_000, 1), discounts })).toBe(true);
  });

  test("is true for an over-discount, which is clamped to the whole line", () => {
    const discounts = recalcDiscounts(10_000, 1, [discount("number", 50_000)]);
    expect(discountsEatLine({ ...line(10_000, 1), discounts })).toBe(true);
  });

  test("is false for a free line with nothing to discount", () => {
    // A zero-price line is not an eaten line: it has no discount to blame.
    expect(discountsEatLine(line(0, 1))).toBe(false);
  });
});

describe("withDerivedDiscounts", () => {
  test("re-derives a percent after the price is corrected", () => {
    const before = {
      ...line(10_000, 1),
      discounts: recalcDiscounts(10_000, 1, [discount("percent", 10)]),
    };
    const after = withDerivedDiscounts({ ...before, price: 20_000 });
    expect(after.discounts[0]?.eff).toBe(2_000);
    expect(lineGrandTotal(after).toNumber()).toBe(18_000);
  });

  test("re-derives a pcs discount after the quantity changes", () => {
    const before = {
      ...line(5_000, 3),
      discounts: recalcDiscounts(5_000, 3, [discount("pcs", 1)]),
    };
    const after = withDerivedDiscounts({ ...before, qty: 1 });
    expect(after.discounts[0]?.eff).toBe(5_000);
    expect(lineGrandTotal(after).toNumber()).toBe(0);
  });

  test("keeps the fields it does not own", () => {
    const row = { ...line(1_000, 2), id: "line-1", name: "Kopi", discounts: [] };
    const next = withDerivedDiscounts(row);
    expect(next.id).toBe("line-1");
    expect(next.name).toBe("Kopi");
  });
});

describe("extras", () => {
  test("a flat extra adds its amount", () => {
    expect(extrasTotal([{ kind: "number", value: 2_000 }], new Decimal(10_000)).toNumber()).toBe(
      2_000,
    );
  });

  test("a negative extra is a deduction", () => {
    const base = new Decimal(10_000);
    expect(extrasTotal([{ kind: "number", value: -1_500 }], base).toNumber()).toBe(-1_500);
    expect(purchaseTotal([{ kind: "number", value: -1_500 }], base).toNumber()).toBe(8_500);
  });

  test("a percent extra applies to the running total", () => {
    const base = new Decimal(10_000);
    const effects = recalcExtras(
      [
        { kind: "percent", value: 10 },
        { kind: "percent", value: 10 },
      ],
      base,
    );
    expect(effects.map((effect) => effect.eff.toNumber())).toEqual([1_000, 1_100]);
    expect(effects.at(-1)?.total.toNumber()).toBe(12_100);
  });

  test("a flat extra after a percent ignores the percent's share", () => {
    const base = new Decimal(10_000);
    const effects = recalcExtras(
      [
        { kind: "percent", value: 10 },
        { kind: "number", value: 500 },
      ],
      base,
    );
    expect(effects.map((effect) => effect.eff.toNumber())).toEqual([1_000, 500]);
  });

  test("no extras leaves the subtotal alone", () => {
    const base = new Decimal(10_000);
    expect(extrasTotal([], base).toNumber()).toBe(0);
    expect(purchaseTotal([], base).toNumber()).toBe(10_000);
  });
});

describe("transactionGrandTotal", () => {
  test("adds the cashier's rounding, including a downward one", () => {
    expect(transactionGrandTotal(new Decimal(10_000), 500).toNumber()).toBe(10_500);
    expect(transactionGrandTotal(new Decimal(10_000), -500).toNumber()).toBe(9_500);
  });
});

describe("paidTotal", () => {
  test("sums split methods without float drift", () => {
    const total = paidTotal([{ value: 10_000.1 }, { value: 20_000.2 }, { value: 5_000.3 }]);
    expect(total.toNumber()).toBe(35_000.6);
    expect(total.toString()).toBe("35000.6");
  });
});

describe("roundMoney", () => {
  test("truncates to the record's precision", () => {
    expect(roundMoney(new Decimal(100.004), 2).toNumber()).toBe(100);
    expect(roundMoney(new Decimal(100.006), 2).toNumber()).toBe(100.01);
    expect(roundMoney(new Decimal(10), 0).toNumber()).toBe(10);
  });

  test("rounds a half up, matching record.roundToFix", () => {
    expect(roundMoney(new Decimal("2.5"), 0).toNumber()).toBe(3);
    expect(roundMoney(new Decimal("2.5"), 0).toNumber()).toBe(roundToFix(2.5, 0));
    expect(roundMoney(new Decimal("0.125"), 2).toNumber()).toBe(roundToFix(0.125, 2));
    expect(roundMoney(new Decimal("-2.5"), 0).toNumber()).toBe(roundToFix(-2.5, 0));
  });

  test("a fix outside 0..100 falls back to whole rupiah", () => {
    expect(roundMoney(new Decimal("2.5"), -1).toNumber()).toBe(3);
    expect(roundMoney(new Decimal("2.5"), 101).toNumber()).toBe(3);
    expect(roundMoney(new Decimal("2.6"), 1.5).toNumber()).toBe(3);
  });

  test("keeps a large fix intact", () => {
    expect(roundMoney(new Decimal("1.23456789"), 4).toNumber()).toBe(1.2346);
  });
});
