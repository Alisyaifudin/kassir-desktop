import { TOTALS } from "../mock";
import { rupiah } from "../util-rupiah";

/**
 * What the shop pays. Big, centred and alone — the one number that matters once
 * the draft is assembled.
 */
export function Total() {
  return <p className="text-center text-grand-total tabular-nums">{rupiah(TOTALS.total)}</p>;
}
