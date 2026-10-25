import Decimal from "decimal.js";
import type { DebtRecord } from "~/services/record";

export type DebtSortBy = "paidAt" | "total";
export type DebtSortDir = "asc" | "desc";

/**
 * What the shop is owed, summed in decimal arithmetic. Adding the rupiah totals
 * as floats drifts once a few of them carry cents, which credit records do.
 */
export function totalDebt(records: readonly DebtRecord[]): number {
  return records
    .reduce((total, record) => total.plus(record.total), new Decimal(0))
    .toNumber();
}

/** The list in sort order. Copies: the service's array is a shared snapshot. */
export function sortDebt(
  records: readonly DebtRecord[],
  by: DebtSortBy,
  dir: DebtSortDir,
): DebtRecord[] {
  const sign = dir === "asc" ? 1 : -1;
  return [...records].sort((a, b) => {
    switch (by) {
      case "paidAt":
        return sign * (a.paidAt - b.paidAt);
      case "total":
        return sign * (a.total - b.total);
    }
  });
}
