import { Skeleton } from "~/components/ui/skeleton";

export function Loading() {
  return (
    <main className="mx-auto flex h-full w-full flex-col gap-2 overflow-hidden px-5 py-2">
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground">
          <Skeleton className="mr-1 h-11 w-20 small:h-9" />
          <Skeleton className="mr-1 h-11 w-24 small:h-9" />
          <Skeleton className="h-11 w-32 small:h-9" />
        </div>
      </div>
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
