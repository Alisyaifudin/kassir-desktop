import { BarChart3, AlertCircle, TrendingUp, TrendingDown } from "lucide-react";
import { Skeleton } from "~/components/ui/skeleton";
import { Effect } from "effect";
import { WithLoader } from "~/components/WithLoader";
import { DailySummaryError } from "~/services/daily-summary/error";

type Props = {
  loader: () => Effect.Effect<
    {
      in: number;
      out: number;
    },
    DailySummaryError,
    never
  >;
};

export function TotalTransactionsCard({ loader }: Props) {
  return (
    <WithLoader
      loader={loader}
      loading={<Loading />}
      error={({ e }) => (
        <div className="flex flex-col gap-2 rounded-xl border border-destructive/50 bg-destructive/5 p-6 shadow-sm h-full justify-center">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle size={20} />
            <span className="font-medium">Gagal memuat data</span>
          </div>
          <p className="text-xs text-destructive/80 line-clamp-2">{e.message}</p>
        </div>
      )}
    >
      {(state) => (
        <div className="flex flex-col gap-4 rounded-xl border bg-card p-6 shadow-sm transition-all hover:shadow-md h-full">
          <div className="flex items-center justify-between">
            <span className="font-medium text-muted-foreground">Total Transaksi</span>
            <div className="p-2 rounded-lg bg-blue-500/10">
              <BarChart3 size={20} className="text-blue-500" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t mt-auto">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-green-600">
                <TrendingUp size={14} />
                <span className="text-small font-semibold uppercase tracking-wider">Pemasukan</span>
              </div>
              <span className="font-bold">{state.in}</span>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-amber-600">
                <TrendingDown size={14} />
                <span className="text-small font-semibold uppercase tracking-wider">
                  Pengeluaran
                </span>
              </div>
              <span className="font-bold">{state.out}</span>
            </div>
          </div>
        </div>
      )}
    </WithLoader>
  );
}

function Loading() {
  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-6 shadow-sm h-full">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-9 w-9 rounded-lg" />
      </div>
      <div className="grid grid-cols-2 gap-4 pt-2 border-t mt-auto">
        <div className="flex flex-col gap-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-6 w-10" />
        </div>
        <div className="flex flex-col gap-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-6 w-10" />
        </div>
      </div>
    </div>
  );
}
