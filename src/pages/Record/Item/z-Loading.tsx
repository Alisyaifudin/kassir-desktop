import { Skeleton } from "~/components/ui/skeleton";

/** The ledger's columns, approximated: no, name, unit, qty, total. */
const ROW = "grid grid-cols-[70px_minmax(0,1fr)_150px_60px_150px] items-center gap-2";

/**
 * The record page while it loads, shaped like the tab it opens on: the
 * `Detail | Resi` strip, then the detail face — identity band, goods ledger,
 * and the shelf pinned underneath.
 *
 * It used to be the receipt, back when `Detail | Resi` defaulted to `Resi`: a
 * 400px paper sheet with a header and a few lines, which became a visible
 * jump-to-layout once the ledger became the default. A skeleton that does not
 * match the thing it precedes is worse than a spinner — it promises the wrong
 * screen.
 */
export function Loading() {
  return (
    <div
      className="flex h-full flex-col gap-2 overflow-hidden"
      aria-busy="true"
      aria-label="Memuat catatan"
    >
      <div className="flex flex-none items-center justify-between gap-2">
        <div className="flex gap-1">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-20" />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2">
        {/* Identity band: mode chip, state, id, date, then the muted second line. */}
        <div className="flex shrink-0 flex-col gap-1 border-b px-1 pb-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-16 rounded-md" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-64" />
            <Skeleton className="ml-auto h-6 w-44" />
          </div>
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-5 w-80" />
            <Skeleton className="h-5 w-56" />
          </div>
        </div>

        {/* The ledger — the only band that scrolls on the real page. */}
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden py-1 pr-2">
          <div className={`${ROW} border-b pb-2`}>
            <Skeleton className="h-4 w-5" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-14 justify-self-end" />
            <Skeleton className="h-4 w-8 justify-self-end" />
            <Skeleton className="h-4 w-16 justify-self-end" />
          </div>
          <div className="flex flex-col divide-y">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className={`${ROW} py-2.5`}>
                <Skeleton className="h-4 w-5" />
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-5 w-24 justify-self-end" />
                <Skeleton className="h-5 w-8 justify-self-end" />
                <Skeleton className="h-5 w-24 justify-self-end" />
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-4">
            <Skeleton className="h-16 w-64" />
            <Skeleton className="h-16 w-64" />
          </div>
        </div>

        {/* The shelf: money above, corrections below, never scrolled. */}
        <div className="flex flex-none flex-col gap-2 rounded-lg border bg-muted/30 px-3 py-2">
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-2">
              <Skeleton className="h-10 w-28" />
              <Skeleton className="h-10 w-36" />
            </div>
            <Skeleton className="h-10 w-20" />
          </div>
        </div>
      </div>
    </div>
  );
}
