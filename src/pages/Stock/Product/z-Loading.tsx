import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";
import { GRID_COLUMN_CLASS, useGridColumns } from "~/hooks/use-grid-columns";

export function Loading() {
  const columns = useGridColumns();
  return (
    <ul className={cn("grid gap-1.5 p-1", GRID_COLUMN_CLASS[columns])}>
      {Array.from({ length: 10 }).map((_, i) => (
        <li key={i} className="flex flex-col gap-1 rounded-lg border bg-card p-1.5">
          <Skeleton className="aspect-square w-full rounded-md" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-6 w-1/2" />
        </li>
      ))}
    </ul>
  );
}
