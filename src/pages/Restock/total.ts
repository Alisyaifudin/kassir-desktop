import Decimal from "decimal.js";
import { EXTRAS, LINES, type Line } from "./mock";

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

/** The line's own total: `subtotal − effDiscount`. Not the transaction total. */
export function lineGrandTotal(line: Pick<Line, "price" | "qty" | "discount">): Decimal {
  return lineSubtotal(line).minus(line.discount);
}

function sum(values: Iterable<number | Decimal>): Decimal {
  let total = new Decimal(0);
  for (const value of values) total = total.plus(value);
  return total;
}

/** What the mocked listings come to, before extras and rounding. */
export function mockSubtotal(): Decimal {
  return sum(LINES.map((line) => lineGrandTotal(line)));
}

/** What the mocked purchase-level extras come to. */
export function mockExtras(): Decimal {
  return sum(EXTRAS.map((extra) => extra.eff));
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
