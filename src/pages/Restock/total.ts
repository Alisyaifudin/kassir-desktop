import Decimal from "decimal.js";
import { EXTRAS, LINES, type Line } from "./mock";

/**
 * Money arithmetic for the restock screen. Everything is done on `Decimal` —
 * float `+ - *` drift once a few rupiah totals carry cents, and a purchase is
 * exactly where that shows up.
 */

/** `price × qty × unit − discount`. */
export function lineTotal(line: Pick<Line, "price" | "qty" | "unit" | "discount">): Decimal {
  return new Decimal(line.price).times(line.qty).times(line.unit).minus(line.discount);
}

function sum(values: Iterable<number | Decimal>): Decimal {
  let total = new Decimal(0);
  for (const value of values) total = total.plus(value);
  return total;
}

/** What the mocked listings come to, before extras and rounding. */
export function mockSubtotal(): Decimal {
  return sum(LINES.map((line) => lineTotal(line)));
}

/** What the mocked purchase-level extras come to. */
export function mockExtras(): Decimal {
  return sum(EXTRAS.map((extra) => extra.eff));
}

/** The mocked goods and extras together, before rounding. */
export function mockBase(): Decimal {
  return mockSubtotal().plus(mockExtras());
}

/** What the shop pays: the base plus the cashier's rounding. */
export function grandTotal(rounding: number): Decimal {
  return mockBase().plus(rounding);
}

/** The sum of a draft's payments. */
export function paidTotal(methods: readonly { value: number }[]): Decimal {
  return sum(methods.map((method) => method.value));
}
