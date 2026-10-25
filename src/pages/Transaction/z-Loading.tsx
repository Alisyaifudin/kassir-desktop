import { Skeleton } from "~/components/ui/skeleton";

const ROW = "grid grid-cols-[64px_minmax(0,1fr)_240px_56px] items-stretch divide-x";
const CELL = "flex flex-col justify-center gap-0.5 px-2 py-1";

/**
 * `/transaction` while its tabs load: the strip, the line grid, and the settle
 * bar in their real positions. Same skeleton whether the drafts are still being
 * read or the first tab is being created.
 */
export function Loading() {
  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-hidden"
      aria-busy="true"
      aria-label="Memuat transaksi"
    >
      <div className="flex flex-none items-end gap-2 border-b px-1 pt-1">
        <Skeleton className="mb-1 size-8 rounded-full" />
        <div className="flex flex-1 items-center gap-1 pb-1">
          <Skeleton className="h-9 w-32 rounded-t-md rounded-b-none" />
          <Skeleton className="h-9 w-24 rounded-t-md rounded-b-none" />
        </div>
      </div>

      <section className="flex min-h-0 flex-1 flex-col p-1">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden border">
          <div className="flex min-h-0 flex-1 flex-col divide-y">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className={ROW}>
                <div className={CELL}>
                  <Skeleton className="h-4 w-5" />
                </div>
                <div className={CELL}>
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-5 w-2/3" />
                </div>
                <div className={`${CELL} items-end`}>
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-5 w-24" />
                </div>
                <div className="flex items-center justify-center">
                  <Skeleton className="size-6" />
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-none items-center justify-end border-t px-2 py-1">
            <Skeleton className="h-8 w-28" />
          </div>
        </div>
      </section>

      <div className="flex flex-none flex-col items-stretch border-t lg:flex-row">
        <div className="flex min-w-0 shrink-0 flex-col gap-2 border-b p-2 lg:min-w-[540px] lg:border-r lg:border-b-0">
          <div className="flex items-center gap-2">
            <Skeleton className="h-11 w-[320px] max-w-full" />
            <Skeleton className="h-11 w-[216px]" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="size-9 rounded-md" />
            <Skeleton className="h-8 w-32" />
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center px-2 py-2">
            <Skeleton className="h-12 w-[180px]" />
          </div>
          <div className="flex flex-1 items-center justify-center px-2 pb-2">
            <Skeleton className="h-16 w-1/2" />
          </div>
        </div>
      </div>
    </div>
  );
}
