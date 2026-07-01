import { Skeleton } from "~/components/ui/skeleton";

export function Loading() {
  return (
    <div className="h-[calc(100vh-64px)] small:h-[calc(100vh-48px)] overflow-y-auto overflow-x-hidden w-full">
      <div className="container mx-auto py-8 px-4 max-w-7xl pb-20">
        {/* Header */}
        <div className="flex flex-col gap-1 mb-8">
          <Skeleton className="h-9 w-72" />
          <Skeleton className="h-5 w-64" />
        </div>

        {/* Stats cards */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mb-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col gap-2 rounded-xl border bg-card p-6 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-5 rounded-full" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-8 w-40" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          ))}
        </div>

        {/* Nav section heading */}
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-1 w-8 rounded-full" />
          <Skeleton className="h-7 w-40" />
        </div>

        {/* Nav grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col items-center gap-4 rounded-2xl border bg-card p-8"
            >
              <Skeleton className="h-16 w-16 rounded-2xl" />
              <div className="flex flex-col gap-1 items-center w-full">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
