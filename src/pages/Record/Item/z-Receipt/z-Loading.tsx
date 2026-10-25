import { Skeleton } from "~/components/ui/skeleton";

export function LoadingReceipt() {
  return (
    <div className="flex flex-col gap-5 w-full max-w-[400px] mx-auto">
      <Skeleton className="h-12 w-full" />
      <div className="border pt-5">
        <div className="flex flex-col gap-2 px-2 pb-5">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-32" />
          <div className="h-px bg-border" />
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="flex items-center justify-between gap-3">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
          <div className="h-px bg-border" />
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex items-center justify-between gap-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
