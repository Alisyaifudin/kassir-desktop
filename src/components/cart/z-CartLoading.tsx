import { Skeleton } from "~/components/ui/skeleton";

const ROW = "grid grid-cols-[40px_minmax(0,1fr)_110px_90px_110px] items-center gap-2 px-2 py-3";

/**
 * What a cart screen looks like while its drafts load: the tab strip, the goods
 * grid, and the settle strip, in the places they will occupy a moment later.
 *
 * A spinner in the middle of the screen says "something is happening"; this
 * says *what* is coming and keeps the panel from jumping when it arrives. It is
 * also the shape the screen holds while its first draft is being created, so the
 * hand-off is invisible.
 */
export function CartLoading() {
  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-hidden"
      aria-busy="true"
      aria-label="Memuat keranjang"
    >
      <div className="flex flex-none items-end gap-2 border-b px-1 pt-1">
        <Skeleton className="mb-1 size-8 rounded-full" />
        <div className="flex flex-1 items-center gap-1 pb-1">
          <Skeleton className="h-9 w-28 rounded-t-md rounded-b-none" />
          <Skeleton className="h-9 w-36 rounded-t-md rounded-b-none" />
          <Skeleton className="h-9 w-24 rounded-t-md rounded-b-none" />
        </div>
      </div>

      <div className="m-1 flex min-h-0 flex-1 flex-col overflow-hidden border">
        <div className={`${ROW} flex-none border-b bg-muted/40 py-2`}>
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16 justify-self-end" />
          <Skeleton className="h-4 w-12 justify-self-end" />
          <Skeleton className="h-4 w-16 justify-self-end" />
        </div>
        <div className="flex min-h-0 flex-1 flex-col divide-y">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className={ROW}>
              <Skeleton className="h-4 w-5" />
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-5 w-16 justify-self-end" />
              <Skeleton className="h-5 w-10 justify-self-end" />
              <Skeleton className="h-5 w-20 justify-self-end" />
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-none items-stretch border-t">
        <div className="flex min-w-[420px] flex-3 flex-col gap-2 border-r p-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-10 w-2/3" />
        </div>
        <div className="flex flex-4 flex-col justify-between gap-2 p-2">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="mx-auto h-20 w-2/3" />
        </div>
      </div>
    </div>
  );
}
