import { Loader } from "~/components/Loader";
import { Skeleton } from "~/components/ui/skeleton";
import { useUser } from "~/hooks/use-user";
import { cn } from "~/lib/utils";
import { useDay, type DayFacts } from "./use-day";
import { Card } from "./z-Card";
import { DayError, DayErrorBoundary } from "./z-Error";
import { Ledger } from "./z-Ledger";
import { Stats } from "./z-Stats";
import { Uang } from "./z-Uang";

/**
 * The day's workspace: three figures, then the transactions behind them with the
 * money card beside them. Everything here comes from one query except the
 * pockets, which keep their own boundary — losing them must not hide the day.
 */
export function Day() {
  const res = useDay();

  return (
    <DayErrorBoundary fallback={DayError}>
      <Loader res={res} fallback={<DayLoading />}>
        {({ data }) => <Workspace day={data} />}
      </Loader>
    </DayErrorBoundary>
  );
}

function Workspace({ day }: { day: DayFacts }) {
  const isAdmin = useUser().role === "admin";

  return (
    <div className="flex flex-col gap-4">
      <Stats day={day} />
      <div
        className={cn(
          "grid items-start gap-4",
          isAdmin && "xl:grid-cols-[minmax(0,1fr)_clamp(320px,38%,540px)]",
        )}
      >
        <Ledger records={day.records} />
        {isAdmin ? <Uang /> : null}
      </div>
    </div>
  );
}

function DayLoading() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="flex flex-col gap-2 rounded-xl border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="size-8 rounded-md" />
            </div>
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_clamp(320px,38%,540px)]">
        <Card>
          <div className="flex items-center justify-between border-b px-4 py-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="flex flex-col gap-3 p-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center justify-between gap-4">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </Card>
        <Card className="hidden xl:flex">
          <div className="flex items-center justify-between border-b px-4 py-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-14" />
          </div>
          <div className="flex flex-col gap-3 p-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex items-center justify-between gap-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
