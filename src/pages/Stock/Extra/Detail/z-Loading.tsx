import { Skeleton } from "~/components/ui/skeleton";

export function Loading() {
  return (
    <main className="py-2 px-5 mx-auto max-w-5xl w-full flex flex-col gap-2 flex-1 overflow-hidden">
      <div className="flex flex-col py-1 gap-2 text-normal mx-auto w-full max-w-4xl">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1">
            <div className="grid grid-cols-[120px_1fr] small:grid-cols-[80px_1fr] items-center gap-2">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-4 w-48" />
          </div>
        ))}
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-28" />
        </div>
        <Skeleton className="h-4 w-64" />
      </div>
    </main>
  );
}
