import { Skeleton } from "~/components/ui/skeleton";

export function Loading() {
  return (
    <>
      <div className="flex flex-col gap-2 p-0.5">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1">
            <div className="grid grid-cols-[160px_1fr] small:grid-cols-[100px_1fr] text-normal items-center gap-1">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-4 w-48" />
          </div>
        ))}
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-4 w-48" />
          </div>
        ))}
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="flex flex-col gap-1 p-0.5">
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-5 rounded-full" />
        </div>
        <Skeleton className="h-4 w-48" />
      </div>
    </>
  );
}