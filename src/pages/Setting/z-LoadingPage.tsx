import { Skeleton } from "~/components/ui/skeleton";

/**
 * The hub's own shape while the route loads: the session band a hairline below,
 * then the section rail and its row panel. It mirrors the page, so nothing jumps
 * when the real content lands.
 */
export function LoadingPage() {
  return (
    <div className="flex w-full flex-col gap-6 px-6 py-6 small:gap-4 small:px-3 small:py-3">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-3">
          <Skeleton className="size-12 rounded-md small:size-9" />
          <div className="flex flex-col gap-1">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-5 w-28" />
          </div>
        </div>
        <Skeleton className="h-12 w-32" />
      </div>
      {[0, 1, 2].map((section) => (
        <div key={section} className="grid gap-2 xl:grid-cols-[180px_1fr] xl:items-start xl:gap-6">
          <Skeleton className="h-7 w-24 xl:mt-3" />
          <div className="flex flex-col divide-y overflow-hidden rounded-xl border bg-card">
            {Array.from({ length: section === 2 ? 3 : 1 }).map((_, row) => (
              <div key={row} className="flex items-center gap-4 px-4 py-3">
                <Skeleton className="size-12 shrink-0 rounded-md small:size-9" />
                <div className="flex w-full flex-col gap-1">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-6 w-72" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
