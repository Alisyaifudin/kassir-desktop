import { Skeleton } from "~/components/ui/skeleton";

export function Loading() {
  return (
    <div className="flex flex-col gap-6 p-6 flex-1">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-5 w-80" />
      </div>

      <div className="flex flex-col gap-4">
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="grid grid-cols-[150px_1fr] gap-2 items-center">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
          <Skeleton className="h-10 w-24 self-end mt-2 rounded-lg" />
        </div>

        <div className="rounded-2xl border p-6 shadow-sm">
          <Skeleton className="h-6 w-40" />
        </div>
      </div>
    </div>
  );
}
