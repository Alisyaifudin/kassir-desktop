import { Skeleton } from "~/components/ui/skeleton";

/**
 * A settings screen while its route chunk loads: the page head, then two panels.
 * Detail pages share it — a per-page skeleton that guesses at the wrong number of
 * fields moves the layout when the real form lands, which is worse than a plain
 * hold in the right shape.
 */
export function LoadingScreen() {
  return (
    <div className="flex w-full flex-col gap-6 px-6 py-6 small:gap-4 small:px-3 small:py-3">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-12 w-56" />
        <Skeleton className="h-7 w-96" />
      </div>
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-56 w-full rounded-xl" />
    </div>
  );
}
