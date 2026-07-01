import { Skeleton } from "~/components/ui/skeleton";

export function Loading() {
  return (
    <div className="flex flex-col gap-6 p-6 flex-1 w-full overflow-auto">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-5 w-72" />
      </div>

      <div className="rounded-2xl border bg-card shadow-sm">
        <div className="p-6">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-1 rounded-full" />
            <Skeleton className="h-6 w-24" />
          </div>
          <Skeleton className="h-5 w-64 mt-1 ml-3" />
        </div>
        <div className="border-t" />
        <div className="p-6 grid grid-cols-1 gap-8">
          <div className="flex items-center gap-4">
            <Skeleton className="h-6 w-24 shrink-0" />
            <Skeleton className="h-10 w-40 rounded-lg" />
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className="h-6 w-24 shrink-0" />
            <Skeleton className="h-10 w-40 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
