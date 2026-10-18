import { EXTRAS, LINES } from "./mock";

/**
 * What the mocked listings come to, before extras and rounding. When the
 * listing stage is wired to real data this reads the draft's own lines instead.
 */
export function mockSubtotal(): number {
  return LINES.reduce((sum, line) => sum + line.subtotal, 0);
}

/** What the mocked purchase-level extras come to. */
export function mockExtras(): number {
  return EXTRAS.reduce((sum, extra) => sum + extra.eff, 0);
}

/** The mocked goods and extras together, before rounding. */
export function mockBase(): number {
  return mockSubtotal() + mockExtras();
}

/** What the shop pays: the base plus the cashier's rounding. */
export function grandTotal(rounding: number): number {
  return mockBase() + rounding;
}

/** The sum of a draft's payments. */
export function paidTotal(methods: readonly { value: number }[]): number {
  return methods.reduce((sum, method) => sum + method.value, 0);
}
