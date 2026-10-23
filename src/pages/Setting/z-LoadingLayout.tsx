import { Skeleton } from "~/components/ui/skeleton";

/** The settings shell before the sidebar mounts: same grid, same rail width. */
export function LoadingLayout() {
  return (
    <main className="grid h-[calc(100vh-64px)] w-full flex-1 grid-cols-1 overflow-hidden bg-muted/50 small:h-[calc(100vh-48px)] xl:grid-cols-[264px_1fr] lg:small:grid-cols-[180px_1fr]">
      <div className="hidden h-full flex-col gap-1 px-3 py-3 xl:flex lg:small:flex">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
      <div className="h-full overflow-hidden">
        <div className="flex flex-col gap-4 px-6 py-6 small:px-3 small:py-3">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-7 w-96" />
          <div className="flex flex-col gap-4">
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-56 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </main>
  );
}
