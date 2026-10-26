import Decimal from "decimal.js";
import { roundToFix } from "./round";

/** The purchase line shape capital allocation needs. */
export type CapitalLine = {
  qty: number;
  unit: number;
  price: number;
  discounts: readonly { eff: number }[];
};

export type CapitalAllocation = {
  /** `qty × price − Σ discount.eff`, the entered line total. */
  lineTotal: Decimal;
  /** The line's quantity in base pcs. */
  pcs: number;
  /** This line's share of the final grand total. */
  effTotal: Decimal;
  /** `effTotal / pcs`, the cost per pc. */
  capital: Decimal;
};

/**
 * Allocate the final grand total across purchase lines by their own line totals.
 * Returns null when the lines sum to zero, where the proportional split is
 * undefined.
 *
 * `capital` is the cost per pc the purchase will store on its stock lot and on
 * the record line, so it is rounded to the record's precision (`record_fix`)
 * here, at the one place it is derived — a 30.001 purchase of 3 pcs is
 * 10.000,33, not 10.000,333333333333. The other figures stay at full precision:
 * they are inputs to the split, not something that gets stored.
 */
export function allocateCapital(
  lines: readonly CapitalLine[],
  grand: Decimal,
  fix: number,
): CapitalAllocation[] | null {
  const lineTotals = lines.map((line) =>
    new Decimal(line.price)
      .times(line.qty)
      .minus(line.discounts.reduce((total, discount) => total.plus(discount.eff), new Decimal(0))),
  );
  const subtotal = lineTotals.reduce((total, lineTotal) => total.plus(lineTotal), new Decimal(0));
  if (subtotal.isZero()) return null;

  return lines.map((line, index) => {
    const lineTotal = lineTotals[index];
    const pcs = line.qty * line.unit;
    const effTotal = lineTotal.times(grand).div(subtotal);
    return {
      lineTotal,
      pcs,
      effTotal,
      capital: pcs > 0 ? new Decimal(roundToFix(effTotal.div(pcs).toNumber(), fix)) : new Decimal(0),
    };
  });
}

/** Capital equality at the record's own money precision. */
export function sameCapital(a: number, b: number, fix: number): boolean {
  const digits = Number.isInteger(fix) && fix >= 0 && fix <= 100 ? fix : 0;
  return Number(a.toFixed(digits)) === Number(b.toFixed(digits));
}
