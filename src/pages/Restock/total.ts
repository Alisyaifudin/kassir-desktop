import Decimal from "decimal.js";
import { EXTRAS, LINES, type DiscountLine, type Extra, type Line } from "./mock";

/**
 * Money arithmetic for the restock screen. Everything is done on `Decimal` —
 * float `+ - *` drift once a few rupiah totals carry cents, and a purchase is
 * exactly where that shows up.
 */

/**
 * The line before its discount: `price × qty`. The price is per `unit`, so the
 * unit is folded into the price rather than multiplied again; it is kept on the
 * line for the record.
 */
export function lineSubtotal(line: Pick<Line, "price" | "qty">): Decimal {
  return new Decimal(line.price).times(line.qty);
}

/** The line's own total: `subtotal − Σ eff`. Not the transaction total. */
export function lineGrandTotal(line: Pick<Line, "price" | "qty" | "discounts">): Decimal {
  return lineSubtotal(line).minus(lineDiscountTotal(line));
}

/** The rupiah the line's discount stack takes off, in total. */
export function lineDiscountTotal(line: Pick<Line, "discounts">): Decimal {
  return line.discounts.reduce((total, discount) => total.plus(discount.eff), new Decimal(0));
}

/**
 * Recompute each discount in order: its `eff` (the rupiah it takes off) and the
 * running `total` after it. A percent applies to the running total, so the
 * stack is order-dependent.
 */
export function recalcDiscounts(
  price: number,
  qty: number,
  lines: readonly DiscountLine[],
): DiscountLine[] {
  let running = new Decimal(price).times(qty);
  return lines.map((line) => {
    let eff: Decimal;
    switch (line.kind) {
      case "number":
        eff = new Decimal(line.value);
        break;
      case "pcs":
        eff = new Decimal(line.value).times(price);
        break;
      case "percent":
        eff = new Decimal(line.value).div(100).times(running);
        break;
    }
    running = running.minus(eff);
    return { ...line, eff: eff.toNumber(), total: running.toNumber() };
  });
}

function sum(values: Iterable<number | Decimal>): Decimal {
  let total = new Decimal(0);
  for (const value of values) total = total.plus(value);
  return total;
}

/** What a set of lines comes to, before extras and rounding. */
export function linesSubtotal(lines: readonly Line[]): Decimal {
  return sum(lines.map((line) => lineGrandTotal(line)));
}

/**
 * An extra's rupiah effect on the purchase: a flat amount, or a percent of the
 * goods subtotal. Percent is on the goods alone, not on the other extras.
 */
export function extraEffective(
  extra: Pick<Extra, "kind" | "value">,
  subtotal: Decimal,
): Decimal {
  return extra.kind === "percent"
    ? subtotal.times(extra.value).div(100)
    : new Decimal(extra.value);
}

/** The rupiah all the extras come to, given the goods subtotal. */
export function extrasTotal(extras: readonly Extra[], subtotal: Decimal): Decimal {
  return sum(extras.map((extra) => extraEffective(extra, subtotal)));
}

/** What the mocked listings come to, before extras and rounding. */
export function mockSubtotal(): Decimal {
  return linesSubtotal(LINES);
}

/** What the mocked purchase-level extras come to. */
export function mockExtras(): Decimal {
  return extrasTotal(EXTRAS, mockSubtotal());
}

/** The mocked goods and extras together, before rounding. */
export function mockBase(): Decimal {
  return mockSubtotal().plus(mockExtras());
}

/**
 * The whole transaction: the lines' grand totals, plus the purchase-level extras
 * and the cashier's rounding. Distinct from `lineGrandTotal`.
 */
export function transactionGrandTotal(rounding: number): Decimal {
  return mockBase().plus(rounding);
}

/** The sum of a draft's payments. */
export function paidTotal(methods: readonly { value: number }[]): Decimal {
  return sum(methods.map((method) => method.value));
}
