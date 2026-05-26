import { Skeleton } from "~/components/ui/skeleton";

export function Loading() {
  return (
    <main className="flex flex-col gap-2 p-2 overflow-y-auto">
      <div className="flex justify-between items-center gap-2">
        <div className="flex gap-1">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-20" />
        </div>
      </div>
      <div className="flex flex-col gap-5 w-full max-w-[400px] mx-auto">
        <Skeleton className="h-12 w-full" />
        <div className="border pt-5">
          <div className="flex flex-col gap-2 px-2 pb-5">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </div>
    </main>
  );
}
