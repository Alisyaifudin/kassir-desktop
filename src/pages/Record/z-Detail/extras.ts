import type { RecordExtra, RecordFull } from "~/services/record";
import { roundToFix } from "~/services/record/round";

/**
 * Money for the detail pane: the sign leads, so a discount reads "-Rp5.000"
 * rather than "Rp-5.000", and the amount is rounded to the record's own
 * precision. `record_extra_eff` is stored unrounded — 1,840 rows carry more
 * decimals than the record's `fix` (e.g. 1492152.94272 on a `fix = 0` record) —
 * so without this the table would print five decimals of rupiah.
 */
export function rupiah(value: number, fix: number): string {
  const amount = roundToFix(Math.abs(value), fix).toLocaleString("id-ID");
  return `${value < 0 ? "-" : ""}Rp${amount}`;
}

/**
 * "Rp354.000 (11%)" for a percentage extra — the money it worked out to, with
 * the rate it came from — and plain money for a flat amount, where `value` and
 * `eff` are the same number.
 */
export function extraAmount(extra: RecordExtra, fix: number): string {
  const amount = rupiah(extra.eff, fix);
  return extra.kind === "percent" ? `${amount} (${extra.value.toLocaleString("id-ID")}%)` : amount;
}

/**
 * Running total per extra — the table's last column.
 *
 * Anchored on `record.total` and walked backwards, because that total is the
 * authoritative figure: the footer shows it, so the column has to land on it, and
 * stepping back by each extra keeps every row exactly one `eff` apart.
 *
 * Summing forward from the subtotal cannot promise that. On 115 of the 5,712
 * records carrying extras the stored `record_sub_total` and `record_total`
 * disagree by a fraction of a rupiah (legacy rounding), and a fraction is enough
 * to tip the rounded final row one rupiah away from the footer.
 *
 * Each value is rounded for display only; rounding mid-sum would accumulate error.
 */
export function extrasRunningTotals(record: RecordFull): number[] {
  const totals: number[] = new Array(record.extras.length);
  let running = record.total;
  for (let index = record.extras.length - 1; index >= 0; index -= 1) {
    totals[index] = running;
    running -= record.extras[index].eff;
  }
  return totals;
}
