import { Skeleton } from "~/components/ui/skeleton";

/**
 * The left pane while the day's records load: the table's own column headers, the
 * rows, and the day total underneath. The right pane is not part of it — that
 * column waits on its own record, and an empty selection has nothing to draw.
 */
export function RecordsLoading() {
  return (
    <div className="flex flex-col gap-1 overflow-hidden h-full" aria-busy="true" aria-label="Memuat riwayat">
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="flex flex-col gap-1 overflow-hidden h-full">
          <div className="flex-1 min-h-0 overflow-hidden">
            <div className="border-b px-2 py-2">
              <div className="grid grid-cols-[30px_1fr_90px_100px] items-center gap-2 small:grid-cols-[10px_1fr_93px_80px]">
                <Skeleton className="h-4 w-6" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-14" />
                <Skeleton className="ml-auto h-4 w-16" />
              </div>
            </div>
            <div className="p-2">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[30px_1fr_90px_100px] items-center gap-2 py-1.5 small:grid-cols-[10px_1fr_93px_80px]"
                >
                  <Skeleton className="h-4 w-5" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="ml-auto h-4 w-20" />
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 border-t py-2 mt-auto">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * The route's chunk fallback: the same split-pane shape the page takes, both
 * panes empty. (`RecordsLoading` is the data skeleton for the left pane alone.)
 */
export function Loading() {
  return (
    <div
      className="grid gap-2 h-full overflow-hidden p-0.5 grid-cols-[490px_1px_1fr] small:grid-cols-[335px_1px_1fr]"
      aria-busy="true"
      aria-label="Memuat riwayat"
    >
      <RecordsLoading />
      <div className="border-l h-full" />
      <div className="flex flex-col gap-2 p-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  );
}
