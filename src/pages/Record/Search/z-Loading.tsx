import { Skeleton } from "~/components/ui/skeleton";

export function Loading() {
  return (
    <main className="flex flex-col gap-3 p-2 flex-1 overflow-hidden">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-8 w-80" />
      </div>
      <div className="grid gap-2">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={idx} className="p-2 border rounded-md">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-full mt-1" />
            <Skeleton className="h-4 w-5/6 mt-1" />
          </div>
        ))}
      </div>
    </main>
  );
}
