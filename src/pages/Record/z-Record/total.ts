import Decimal from "decimal.js";
import type { Record as RecordModel } from "~/services/record";
import { recordPaymentLines, type MethodSelection } from "../method-filter";

/**
 * One record's `Total` column, added up.
 *
 * It is read back from the same payment lines the list prints (`contribution`,
 * tender less the change that came back out of it) instead of from `grandTotal`
 * minus `change` here, because the filter decides which tender owns the change:
 *
 * - a record paid cash in two goes hands the change back **once**, off the first
 *   cash line — subtracting it per cash row would take it off twice;
 * - a filter that hides the cash line subtracts nothing, since the lines left on
 *   screen are their own money;
 * - a record that took no cash gives the change back on its last method, and an
 *   underpaid one (a credit, `change < 0`) gives nothing back at all.
 *
 * A record with no moneyed line the filter lets through — a credit nothing has
 * settled yet, an unsettled split — falls back to its grand total, the same
 * fallback the list's `Amount` makes, so the footer can never disagree with the
 * column above it.
 */
export function recordTotal(record: RecordModel, selection: MethodSelection): Decimal {
  const lines = recordPaymentLines(record, selection);
  if (lines.length === 0) return new Decimal(record.grandTotal);
  return Decimal.sum(...lines.map((line) => line.contribution));
}

/**
 * The footer's figure: every listed record's `Total` column, added up in decimal
 * (contributions arrive as floats, so adding the numbers directly would print
 * `300.00000000000006` on a bad day).
 */
export function recordsTotal(
  records: readonly RecordModel[],
  selection: MethodSelection,
): number {
  return records
    .reduce((total, record) => total.add(recordTotal(record, selection)), new Decimal(0))
    .toNumber();
}
