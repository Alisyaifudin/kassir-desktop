import { Skeleton } from "~/components/ui/skeleton";

export function Loading() {
  return (
    <div className="flex flex-col gap-4 p-6 flex-1 overflow-hidden">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-5 w-96" />
      </div>
      <div className="rounded-2xl border bg-card p-4 shadow-sm flex-1 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-8 w-20" />
        </div>
        <div className="flex flex-col gap-2  rounded-xl p-4 h-full overflow-auto">
          {Array.from({ length: 15 }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-3 bg-white/10 rounded animate-pulse"
              style={{ width: `${60 + ((i * 7) % 40)}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
