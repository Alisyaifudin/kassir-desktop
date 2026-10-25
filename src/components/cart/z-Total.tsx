import type Decimal from "decimal.js";
import { Skeleton } from "~/components/ui/skeleton";
import { ReservedSkeleton } from "~/components/page-data";
import { rupiah } from "~/components/cart/util-rupiah";

/**
 * What the shop pays. Big, centred and alone — the one number that matters once
 * the draft is assembled. `fix` comes from the draft's precision so this and the
 * payment stage cannot disagree.
 *
 * `grand` is `null` until the draft arrives: the line and the `Rp` are static, so
 * they are drawn at once and only the amount pulses in place — after the
 * anti-flash window, in a box that has held its place since the first frame.
 */
export function Total({ grand, fix }: { grand: Decimal | null; fix: number }) {
  // `data-testid` because this is a div, not a button: the e2e harness has no
  // role to address it by.

  return (
    // A block, not a `<p>`: the placeholder inside is a `div`, and a `<div>` may
    // not live inside a paragraph (React reports the nesting as an error).
    <div data-testid="grand-total" className="text-center text-grand-total tabular-nums">
      {grand === null ? (
        <div className="flex items-center gap-1">
          Rp
          <ReservedSkeleton>
            <Skeleton className="h-[120px] small:h-[100px] w-[400px] small:w-[300px]" />
          </ReservedSkeleton>
        </div>
      ) : (
        rupiah(grand, fix)
      )}
    </div>
  );
}
