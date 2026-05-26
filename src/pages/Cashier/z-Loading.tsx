import { Skeleton } from "~/components/ui/skeleton";

export function Loading() {
  return (
    <div className="flex flex-col gap-4 p-6 flex-1 overflow-auto">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-5 w-96" />
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-[1fr_140px_40px] small:grid-cols-[1fr_110px_40px] items-center p-3 gap-3 rounded-xl bg-muted/30"
          >
            <Skeleton className="h-8 w-full rounded-lg" />
            <Skeleton className="h-8 w-full rounded-lg" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        ))}
      </div>
      <div className="h-20 bg-muted/30 rounded-xl p-4 flex items-center justify-center">
        <Skeleton className="h-10 w-48" />
      </div>
    </div>
  );
}
