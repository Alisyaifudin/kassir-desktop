import type Decimal from "decimal.js";
import { rupiah } from "~/pages/_cart/util-rupiah";

/**
 * What the shop pays. Big, centred and alone — the one number that matters once
 * the draft is assembled. `fix` comes from the draft's precision so this and the
 * payment stage cannot disagree.
 */
export function Total({ grand, fix }: { grand: Decimal; fix: number }) {
  // `data-testid` because this is a div, not a button: the e2e harness has no
  // role to address it by.
  return (
    <p data-testid="grand-total" className="text-center text-grand-total tabular-nums">
      {rupiah(grand, fix)}
    </p>
  );
}
