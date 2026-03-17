import { Skeleton } from "~/components/ui/skeleton";

export function Loading() {
  return (
    <main className="flex flex-col gap-2 p-2 flex-1 overflow-hidden h-full">
      <div className="flex items-center gap-2">
        <Skeleton className="h-10 w-28" />
        <Skeleton className="h-10 w-28" />
        <Skeleton className="h-10 w-28" />
      </div>
      <div className="grid gap-2 grid-cols-1 small:grid-cols-2 xl:grid-cols-3 flex-1">
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
      </div>
      <Skeleton className="h-64 w-full" />
    </main>
  );
}
