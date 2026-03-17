import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";

export function Loading() {
  return (
    <div className="flex flex-col gap-4 p-6 w-full flex-1 overflow-hidden">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-5 w-96" />
      </div>

      <div
        className={cn(
          "grid gap-2 items-center text-normal",
          "grid-cols-[250px_1fr] small:grid-cols-[200px_1fr]",
        )}
      >
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-6 w-24" />
      </div>

      <div className="flex flex-col gap-1 overflow-y-auto">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "grid gap-2 items-center text-normal",
              "grid-cols-[250px_1fr] small:grid-cols-[200px_1fr]",
            )}
          >
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>

      <div className="h-20 bg-muted/30 rounded-xl p-4 flex items-center justify-center">
        <Skeleton className="h-10 w-48" />
      </div>
    </div>
  );
}
