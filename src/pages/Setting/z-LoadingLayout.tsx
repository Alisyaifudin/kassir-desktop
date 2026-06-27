import { Skeleton } from "~/components/ui/skeleton";

export function LoadingLayout() {
  return (
    <main className="grid gap-2 p-2 flex-1 w-full overflow-hidden h-[calc(100vh-64px)] small:h-[calc(100vh-48px)] grid-cols-1 xl:grid-cols-[300px_1fr] lg:small:grid-cols-[200px_1fr]">
      <div className="hidden xl:flex lg:small:flex flex-col gap-3 p-2 border rounded-lg h-full">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
      <div className="overflow-hidden h-full">
        <div className="flex flex-col gap-2 p-2 h-full">
          <Skeleton className="h-8 w-52" />
          <Skeleton className="h-6 w-32" />
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-40 w-full" />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
