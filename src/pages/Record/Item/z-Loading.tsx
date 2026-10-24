import { Skeleton } from "~/components/ui/skeleton";
import { DetailSkeleton } from "../z-Detail/z-Loading";

/**
 * The record page while it loads, shaped like the tab it opens on: the
 * `Detail | Resi` strip, then the detail face — identity band, goods ledger,
 * and the shelf pinned underneath. The face itself comes from the shared
 * `DetailSkeleton`, which the pane on `/records` draws too.
 *
 * It used to be the receipt, back when `Detail | Resi` defaulted to `Resi`: a
 * 400px paper sheet with a header and a few lines, which became a visible
 * jump-to-layout once the ledger became the default. A skeleton that does not
 * match the thing it precedes is worse than a spinner — it promises the wrong
 * screen.
 */
export function Loading() {
  return (
    <div className="flex h-full flex-col gap-2 overflow-hidden">
      <div className="flex flex-none items-center justify-between gap-2">
        <div className="flex gap-1">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-20" />
        </div>
      </div>
      <DetailSkeleton />
    </div>
  );
}
