import Decimal from "decimal.js";
import type { Extra as ExtraTx } from "~/transaction-effect/extra/get-by-tab";
import type { Extra } from ".";

export function calcEff(
  base: Decimal,
  value: number,
  kind: TX.ValueKind,
): {
  eff: number;
  subtotal: Decimal;
} {
  let eff = value;
  if (kind === "percent") {
    eff = base.times(value).div(100).toNumber();
  }
  const subtotal = base.plus(eff);
  return {
    eff,
    subtotal,
  };
}

export function transformExtra(subtotal: Decimal, extras: ExtraTx[]): Extra[] {
  let total = new Decimal(subtotal);
  const arr: Extra[] = [];
  for (const extra of extras) {
    const { subtotal, eff } = calcEff(total, extra.value, extra.kind);
    arr.push({
      ...extra,
      subtotal: subtotal.toNumber(),
      eff,
      base: total.toNumber(),
    });
    total = subtotal;
  }
  return arr;
}