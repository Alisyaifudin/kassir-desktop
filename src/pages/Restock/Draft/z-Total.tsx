import type Decimal from "decimal.js";
import { rupiah } from "../util-rupiah";

/**
 * What the shop pays. Big, centred and alone — the one number that matters once
 * the draft is assembled. `fix` comes from the draft's precision so this and the
 * payment stage cannot disagree.
 */
export function Total({ grand, fix }: { grand: Decimal; fix: number }) {
  return <p className="text-center text-grand-total tabular-nums">{rupiah(grand, fix)}</p>;
}
