import { AlertCircle } from "lucide-react";
import { Loader } from "~/components/Loader";
import { createErrorBoundary } from "~/components/createErrorBoundary";
import { Skeleton } from "~/components/ui/skeleton";
import { RecordError } from "~/services/record";
import { useStats } from "./use-stats";
import { ExpenseCard } from "./z-ExpenseCard";
import { IncomeCard } from "./z-IncomeCard";
import { TotalTransactionsCard } from "./z-TotalTransactionsCard";

const StatsErrorBoundary = createErrorBoundary(RecordError);

export function StatsGrid() {
  const res = useStats();

  return (
    <StatsErrorBoundary fallback={StatsError}>
      <Loader res={res} fallback={<StatsLoading />}>
        {({ data: stats }) => (
          <Grid>
            <IncomeCard stats={stats} />
            <ExpenseCard stats={stats} />
            <TotalTransactionsCard stats={stats} />
          </Grid>
        )}
      </Loader>
    </StatsErrorBoundary>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mb-8">{children}</div>
  );
}

function StatsLoading() {
  return (
    <Grid>
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="flex flex-col gap-2 rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="size-5 rounded-full" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      ))}
    </Grid>
  );
}

function StatsError({ error }: { error: RecordError }) {
  return (
    <div className="mb-8 flex items-center gap-3 rounded-xl border border-destructive/50 bg-destructive/5 p-6">
      <AlertCircle className="size-6 shrink-0 text-destructive small:size-5" />
      <div className="flex flex-col gap-0.5">
        <span className="font-medium text-destructive">Gagal memuat ringkasan</span>
        <p className="text-small text-muted-foreground">{error.message}</p>
      </div>
    </div>
  );
}
