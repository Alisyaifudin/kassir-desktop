import Decimal from "decimal.js";

/**
 * Money arithmetic for a cart, shared by the Pos and Restock screens and by the
 * transaction service that commits them. Everything is done on `Decimal` —
 * float `+ - *` drift once a few rupiah totals carry cents, and a purchase is
 * exactly where that shows up.
 *
 * The shapes are structural on purpose: the screens keep their own draft types
 * (the round-trip fields, the undo base), and only the money-bearing fields are
 * required here.
 */

export type DiscountKind = "number" | "percent" | "pcs";

export type DiscountLine = {
  value: number;
  kind: DiscountKind;
  eff: number;
  total: number;
};

export type Line = {
  price: number;
  qty: number;
  discounts: readonly DiscountLine[];
};

export type Extra = {
  kind: "number" | "percent";
  value: number;
};

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
export function recalcDiscounts<T extends DiscountLine>(
  price: number,
  qty: number,
  lines: readonly T[],
): (T & { eff: number; total: number })[] {
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

/** One extra's computed effect and the running total after it. */
export type ExtraEffect = { eff: Decimal; total: Decimal };

/**
 * Work through the extras in order. A percent applies to the running total —
 * the goods subtotal plus whatever came before it — so the same extras in a
 * different order do not add up to the same thing. A flat amount ignores the
 * running total.
 */
export function recalcExtras(extras: readonly Extra[], subtotal: Decimal): ExtraEffect[] {
  let running = subtotal;
  return extras.map((extra) => {
    const eff =
      extra.kind === "percent" ? running.times(extra.value).div(100) : new Decimal(extra.value);
    running = running.plus(eff);
    return { eff, total: running };
  });
}

/** The rupiah all the extras come to, given the goods subtotal. */
export function extrasTotal(extras: readonly Extra[], subtotal: Decimal): Decimal {
  return sum(recalcExtras(extras, subtotal).map((effect) => effect.eff));
}

/** The purchase before rounding: the goods subtotal plus every extra. */
export function purchaseTotal(extras: readonly Extra[], subtotal: Decimal): Decimal {
  return subtotal.plus(extrasTotal(extras, subtotal));
}

/**
 * The whole transaction: the goods and extras, plus the cashier's rounding.
 * Distinct from `lineGrandTotal`.
 */
export function transactionGrandTotal(base: Decimal, rounding: number): Decimal {
  return base.plus(rounding);
}

/** The sum of a draft's payments. */
export function paidTotal(methods: readonly { value: number }[]): Decimal {
  return sum(methods.map((method) => method.value));
}

/**
 * Round money to the record's precision (`record_fix`). Only the derived
 * figures — pay, grand total, change — use this; the stored line amounts stay
 * at full precision.
 */
export function roundMoney(value: Decimal, fix: number): Decimal {
  const digits = Number.isInteger(fix) && fix >= 0 && fix <= 100 ? fix : 0;
  return new Decimal(value.toFixed(digits));
}
