import { Skeleton } from "~/components/ui/skeleton";

export function Loading() {
  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <Skeleton className="h-10 w-40" />
      <Skeleton className="min-h-0 w-full flex-1" />
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="size-20 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
