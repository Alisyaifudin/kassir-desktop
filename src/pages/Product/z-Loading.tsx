import { Skeleton } from "~/components/ui/skeleton";
import type { ViewMode } from "./use-list-state";

export function Loading({ view = "grid" }: { view?: ViewMode }) {
  if (view === "table") {
    return (
      <div className="flex flex-col gap-2 pt-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 pt-2">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-xl border p-2">
          <Skeleton className="aspect-square w-full rounded-lg" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}
