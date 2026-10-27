import { Skeleton } from "~/components/ui/skeleton";

/** One chart card's shape, for a sub-page's own fetch. */
export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div className={`flex flex-col gap-2 rounded-xl border bg-card p-3 ${className ?? ""}`}>
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export function SummarySkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="flex flex-col gap-2 rounded-xl border bg-card p-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

/**
 * The body while the chart chunk loads. The rail and the period controls beside
 * it are static and already on screen, so this draws only what the chunk fills:
 * the summary band and the two charts under it.
 */
export function AnalyticsBodyLoading() {
  return (
    <div
      className="flex min-h-0 flex-col gap-3"
      aria-busy="true"
      aria-label="Memuat analisis"
    >
      <SummarySkeleton />
      <div className="grid gap-3 lg:grid-cols-2">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    </div>
  );
}
