import { Skeleton } from "~/components/ui/skeleton";

/** One chart card's shape, for a sub-page's own fetch. */
export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div className={`flex flex-col gap-2 rounded-xl border bg-card p-3 ${className ?? ""}`}>
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-64 w-full small:h-52" />
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

/** The whole screen while the lazy route loads. */
export function AnalyticsLoading() {
  return (
    <main
      className="flex h-full min-h-0 overflow-hidden"
      aria-busy="true"
      aria-label="Memuat analisis"
    >
      <aside className="flex w-[280px] shrink-0 flex-col gap-1 border-r p-2 small:w-[220px]">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </aside>
      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-2 border-b p-2">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-8 w-40" />
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-2">
          <SummarySkeleton />
          <div className="grid gap-3 lg:grid-cols-2">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
        </div>
      </section>
    </main>
  );
}
