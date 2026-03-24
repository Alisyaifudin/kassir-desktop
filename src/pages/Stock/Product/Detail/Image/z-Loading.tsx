import { Skeleton } from "~/components/ui/skeleton";

export function Loading() {
  return (
    <div className="flex flex-col gap-1 flex-1 w-full min-h-0">
      <div className="flex-1 min-h-0 justify-center items-center flex gap-1">
        <Skeleton className="h-full w-10" />
        <div className="relative flex-1 min-h-0 flex justify-center items-center overflow-hidden">
          <Skeleton className="h-full w-full" />
        </div>
        <Skeleton className="h-full w-10" />
      </div>
      <div className="flex flex-col w-full min-h-0 gap-1">
        <div className="overflow-x-scroll flex items-center gap-1 h-36 overflow-y-hidden">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-32 aspect-square" />
          ))}
        </div>
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  );
}