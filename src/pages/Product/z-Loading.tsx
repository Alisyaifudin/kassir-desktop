import { Skeleton } from "~/components/ui/skeleton";
import type { ViewMode } from "./use-list-state";

export function Loading({ view = "grid" }: { view?: ViewMode }) {
  if (view === "table") {
    return (
      <div className="min-h-0 flex-1 overflow-hidden px-4 py-2">
        <div className="flex flex-col gap-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg small:h-10" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2">
      <div className="grid grid-cols-2 gap-3 pb-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-xl border p-2">
            <Skeleton className="aspect-square w-full rounded-lg" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}
