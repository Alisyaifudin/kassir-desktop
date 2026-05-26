import { Skeleton } from "~/components/ui/skeleton";

export function Loading() {
  return (
    <main className="flex flex-col gap-5 py-2 px-0.5 flex-1 overflow-hidden h-[calc(100vh-64px)] small:h-[calc(100vh-48px)]">
      <div className="flex items-center gap-2">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
      <div className="flex-1 overflow-hidden min-h-0">
        <div className="flex gap-2 h-full">
          <div className="flex-1 flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, idx) => (
              <Skeleton key={idx} className="h-12 w-full" />
            ))}
            <div className="flex-1 overflow-hidden rounded-md border p-2">
              {Array.from({ length: 8 }).map((_, idx) => (
                <Skeleton key={idx} className="h-8 w-full mb-2" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
