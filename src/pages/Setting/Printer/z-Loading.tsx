import { Skeleton } from "~/components/ui/skeleton";

export function Loading() {
  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Printer Selection Loading */}
      <div className="flex flex-col gap-1">
        <div className="flex gap-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-5 rounded-full" />
        </div>
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-10 w-full mt-1" />
      </div>

      {/* Printer Width Loading */}
      <div className="flex flex-col gap-1">
        <div className="flex gap-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-5 w-5 rounded-full" />
        </div>
        <Skeleton className="h-4 w-72" />
        <Skeleton className="h-10 w-32 mt-1" />
      </div>

      {/* Additional loading elements for better UX */}
      <div className="flex flex-col gap-2 mt-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
}