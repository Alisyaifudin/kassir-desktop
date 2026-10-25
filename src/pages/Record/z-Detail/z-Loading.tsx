import { Skeleton } from "~/components/ui/skeleton";

/** The ledger's columns, approximated: no, name, unit, qty, total. */
const ROW = "grid grid-cols-[70px_minmax(0,1fr)_150px_60px_150px] items-center gap-2";

/**
 * A record while it loads, shaped like the face that follows it: the identity
 * band, then the ledger's one scroll with the shelf closing it. Both faces of a
 * record use it — the full page under its `Detail | Resi` strip, the pane in place
 * of the bands themselves — because a skeleton that does not match what it
 * precedes is worse than a spinner: it promises the wrong screen.
 *
 * `close` picks the pane's shape: the close at the leading edge of the first line
 * and `Lihat` at its trailing one, where the full page keeps that line to the id
 * alone and puts its date corrections on the second.
 */
export function DetailSkeleton({ close = false }: { close?: boolean }) {
  return (
    <div
      className="flex h-full min-h-0 flex-1 flex-col gap-2 overflow-hidden"
      aria-busy="true"
      aria-label="Memuat catatan"
    >
      {/* Identity band: the close at the leading edge (pane only), the id, and the
          face's own trailing slot — `Lihat` there, the date corrections here. */}
      <div className="flex shrink-0 flex-col gap-1 border-b px-1 pb-2">
        <div className="flex items-center gap-2">
          {close ? <Skeleton className="size-9 shrink-0 rounded-md" /> : null}
          <Skeleton className="h-6 w-64" />
          {close ? <Skeleton className="ml-auto h-10 w-20 rounded-md" /> : null}
        </div>
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-5 w-80" />
          {close ? null : <Skeleton className="ml-auto h-8 w-56" />}
        </div>
      </div>

      {/* The ledger — the only band that scrolls on the real face. */}
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

        {/* The shelf that closes the ledger: money above, actions below, in the
            same scroll as the rows it prices. */}
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
