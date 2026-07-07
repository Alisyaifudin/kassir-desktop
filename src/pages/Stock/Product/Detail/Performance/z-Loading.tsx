import { Skeleton } from "~/components/ui/skeleton";

export function Loading() {
  return (
    <div className="flex flex-col gap-1 flex-1">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-64" />
      </div>
      <Skeleton className="h-6 w-52" />
      <Skeleton className="flex-1 w-full" />
    </div>
  );
}
