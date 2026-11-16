import type { Discount } from "~/services/record";

/**
 * Discounts on a record line, shared by the record page and the report's
 * classifier. Moved out of `pages/Record/z-Detail/` with `record-money.ts`, for
 * the same reason: one set of rules for what a line costs after its discounts.
 *
 * The line's running total, one entry per discount — each row shows what that
 * discount left behind, which is what the receipt prints underneath the price.
 *
 * Stepped the same way the receipt steps it (subtract each `eff` in order), so the
 * table and the printed paper agree.
 */
export function discountTotals(price: number, qty: number, discounts: Discount[]): number[] {
  const totals: number[] = [];
  let running = price * qty;
  for (const discount of discounts) {
    running -= discount.eff;
    totals.push(running);
  }
  return totals;
}

/** "Diskon 10%", "Diskon 2pcs", or plain "Diskon" for a flat amount. */
export function discountLabel(discount: Discount): string {
  switch (discount.kind) {
    case "percent":
      return `Diskon ${discount.value}%`;
    case "pcs":
      return `Diskon ${discount.value}pcs`;
    case "number":
      return "Diskon";
  }
}
