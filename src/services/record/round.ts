/**
 * The record's own money precision (`record_fix` decimal places). Shared by the
 * service and the detail pane so what the table shows and what the totals say
 * come from the same arithmetic.
 */
export function roundToFix(value: number, fix: number): number {
  const digits = Number.isInteger(fix) && fix >= 0 && fix <= 100 ? fix : 0;
  return Number(value.toFixed(digits));
}
