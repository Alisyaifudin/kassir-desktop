import { Skeleton } from "~/components/ui/skeleton";

export function Loading() {
  return (
    <div className="flex flex-col gap-4 p-6 flex-1 overflow-auto">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-5 w-96" />
      </div>

      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2 p-3 rounded-xl bg-muted/30">
              <div className="flex items-center gap-3 w-full">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-8 flex-1 rounded-lg" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
              <Skeleton className="h-3 w-48 rounded" />
            </div>
          ))}
        </div>
      </div>

      <div className="h-20 bg-muted/30 rounded-xl p-4 flex items-center justify-center">
        <Skeleton className="h-10 w-48" />
      </div>
    </div>
  );
}
