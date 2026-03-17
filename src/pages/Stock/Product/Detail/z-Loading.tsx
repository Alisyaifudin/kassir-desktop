import { Skeleton } from "~/components/ui/skeleton";

export function Loading() {
  return (
    <main className="py-2 px-5 mx-auto w-full h-full flex flex-col gap-2 overflow-hidden max-h-[calc(100vh-68px)] small:max-h-[calc(100vh-44px)]">
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground">
          <Skeleton className="h-8 w-20 mr-1" />
          <Skeleton className="h-8 w-24 mr-1" />
          <Skeleton className="h-8 w-32" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="grid gap-3">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <div className="grid grid-cols-1 small:grid-cols-2 gap-3">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
          <div className="grid grid-cols-1 small:grid-cols-3 gap-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    </main>
  );
}
