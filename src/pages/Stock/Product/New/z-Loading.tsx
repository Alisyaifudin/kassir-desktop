import { Skeleton } from "~/components/ui/skeleton";

export function Loading() {
  return (
    <main className="p-2 mx-auto w-full max-w-5xl flex flex-col gap-3">
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-12 w-32" />
    </main>
  );
}
