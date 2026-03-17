import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";

export function Loading() {
  return (
    <div
      className={cn(
        "grid gap-2 h-full overflow-hidden grid-cols-[490px_1px_1fr] small:grid-cols-[335px_1px_1fr]",
      )}
    >
      <div className="h-full overflow-hidden">
        <div className="flex flex-col gap-1 overflow-hidden h-full">
          <div className="flex-1 min-h-0 overflow-hidden">
            <div className="p-2">
              <Skeleton className="h-8 w-48" />
              <div className="grid grid-cols-4 gap-2 mt-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-6" />
                ))}
              </div>
            </div>
            <div className="p-2 overflow-auto h-[calc(100%-4rem)]">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="py-1">
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 py-2 border-t">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </div>
      <div className="border-l h-full" />
      <div className="h-full overflow-hidden">
        <div className="flex flex-col gap-2 p-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    </div>
  );
}
