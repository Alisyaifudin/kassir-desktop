import { Skeleton } from "~/components/ui/skeleton";

export function ComboFormLoading() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden" aria-busy="true">
      <div className="flex shrink-0 items-end gap-3 border-b px-3 py-2">
        <Skeleton className="h-9 min-w-0 flex-1" />
        <Skeleton className="h-9 w-32 shrink-0" />
        <Skeleton className="h-9 w-20 shrink-0" />
      </div>
      <Skeleton className="h-11 w-full shrink-0 rounded-none" />
      <div className="min-h-0 flex-1 overflow-hidden">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-[88px] w-full rounded-none border-b" />
        ))}
      </div>
      <div className="flex min-h-[76px] shrink-0 items-center justify-between gap-4 border-t px-4 py-2">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-48" />
        </div>
        <Skeleton className="h-12 w-36 rounded-none" />
      </div>
    </div>
  );
}
