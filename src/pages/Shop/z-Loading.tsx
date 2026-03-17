import { Skeleton } from "~/components/ui/skeleton";

export function Loading() {
  return (
    <main className="flex flex-col min-h-0 h-full overflow-hidden grow shrink basis-0 relative">
      <div className="gap-2 pt-1 grid-cols-[clamp(700px,33%,800px)_1fr] grid small:grid-cols-[clamp(360px,33%,500px)_1fr] overflow-x-hidden h-full">
        <div className="flex flex-col overflow-hidden justify-between w-full h-full border-r">
          <div className="flex flex-col overflow-hidden">
            <div className="flex items-center gap-2 p-2 border-b">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-20" />
            </div>
            <div className="flex flex-col gap-2 p-2 overflow-hidden">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          <div style={{ flex: "0 0 auto" }}>
            <hr />
            <div className="flex flex-col p-2 h-fit gap-2">
              <div className="flex items-center gap-1 justify-between w-full">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-10 w-48" />
              </div>
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        </div>
        <div className="border-r flex-1 flex flex-col m-1 overflow-hidden">
          <div className="flex items-center justify-between gap-2 p-2 border-b">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-8 w-24" />
          </div>
          <div className="flex-1 p-2 overflow-hidden">
            <Skeleton className="h-full w-full" />
          </div>
          <div className="flex items-center justify-between border-t p-2">
            <div className="flex items-center gap-3">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
            <Skeleton className="h-6 w-24" />
          </div>
          <div className="border-t p-2">
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
      <div className="h-0" />
    </main>
  );
}