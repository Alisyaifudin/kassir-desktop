import { Skeleton } from "~/components/ui/skeleton";

export function Loading() {
  return (
    <div className="flex flex-col gap-5 p-5 bg-white mx-auto w-full max-w-5xl">
      <Skeleton className="h-9 w-40" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-[150px_1fr] small:grid-cols-[100px_1fr] items-center"
          >
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ))}
      </div>
      <Skeleton className="h-10 w-28 self-end rounded-lg" />
    </div>
  );
}
