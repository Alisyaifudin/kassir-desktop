import { Skeleton } from "~/components/ui/skeleton";

/**
 * The rail while the day loads: the column labels and enough rows to fill the
 * pane, at the height a row really is, so the list does not jump when it arrives
 * (`page-data` skill: reserve the height, do not swap the card).
 */
export function RailSkeleton() {
  return (
    <div
      className="flex flex-col gap-1 overflow-hidden h-full"
      aria-busy="true"
      aria-label="Memuat laporan"
    >
      <div className="min-h-0 flex-1 overflow-hidden">
        <div className="grid grid-cols-[32px_1fr_14px_10px_72px] gap-1 px-1.5 pb-1">
          <Skeleton className="h-3 w-4" />
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-3" />
          <Skeleton className="ml-auto h-3 w-12" />
        </div>
        {Array.from({ length: 14 }).map((_, index) => (
          <div key={index} className="grid grid-cols-[32px_1fr_14px_10px_72px] gap-1 px-1.5 py-1.5">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-4 w-3" />
            <Skeleton className="ml-auto h-4 w-14" />
          </div>
        ))}
      </div>
      <div className="flex shrink-0 items-center justify-between border-t py-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  );
}

/** The right pane while its read is on the way. */
export function PaneSkeleton() {
  return (
    <div className="flex h-full flex-col gap-3 p-4" aria-busy="true" aria-label="Memuat laporan">
      <Skeleton className="h-5 w-48" />
      <Skeleton className="h-4 w-32" />
      <div className="mt-4 flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-6 w-full" />
        ))}
      </div>
    </div>
  );
}
