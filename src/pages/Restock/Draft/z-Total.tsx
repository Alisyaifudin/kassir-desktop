import { PRECISION, TOTALS } from "../mock";
import { rupiah } from "../util-rupiah";

/**
 * What the shop pays. Big, centred and alone, because this is the number the
 * operator checks against the invoice before handing the money over.
 */
export function Total() {
  return (
    <div className="relative z-0 flex flex-col border-t pb-[36px] pt-1 small:pb-[25px]">
      <p className="text-center text-grand-total tabular-nums">
        {rupiah(TOTALS.subtotal + TOTALS.extras + TOTALS.rounding, PRECISION)}
      </p>
    </div>
  );
}
