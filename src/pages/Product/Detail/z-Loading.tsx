import { Skeleton } from "~/components/ui/skeleton";

/**
 * The detail body while the Performance chunk loads. The header and the three
 * tab links above it are static — they come from the route, not the product — so
 * this draws the pane's own shape and no strip of its own.
 */
export function Loading() {
  return (
    <main className="mx-auto flex h-full w-full flex-col gap-2 overflow-hidden px-5 py-2">
      <div className="flex-1 overflow-y-auto">
        <div className="grid gap-3">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-[54px] w-full small:h-10" />
          <Skeleton className="h-[54px] w-full small:h-10" />
          <Skeleton className="h-[54px] w-full small:h-10" />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    </main>
  );
}
