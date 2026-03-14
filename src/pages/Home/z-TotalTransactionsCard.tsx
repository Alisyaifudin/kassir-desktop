import { BarChart3, AlertCircle, TrendingUp, TrendingDown } from "lucide-react";
import { Result } from "~/lib/result";
import { db } from "~/database";
import { useMemo } from "react";
import { Temporal } from "temporal-polyfill";
import { log } from "~/lib/log";
import { tz } from "~/lib/constants";
import { Skeleton } from "~/components/ui/skeleton";

export function TotalTransactionsCard() {
  const res = useData();
  return Result.match(res, {
    onLoading() {
      return <Loading />;
    },
    onError({ e }) {
      log.error(e);
      return (
        <div className="flex flex-col gap-2 rounded-xl border border-destructive/50 bg-destructive/5 p-6 shadow-sm h-full justify-center">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle size={20} />
            <span className="font-medium">Gagal memuat data</span>
          </div>
          <p className="text-xs text-destructive/80 line-clamp-2">{e.message}</p>
        </div>
      );
    },
    onSuccess({ sell, buy }) {
      return (
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
                <span className="text-small font-semibold uppercase tracking-wider">Penjualan</span>
              </div>
              <span className="font-bold">{sell}</span>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-amber-600">
                <TrendingDown size={14} />
                <span className="text-small font-semibold uppercase tracking-wider">Pembelian</span>
              </div>
              <span className="font-bold">{buy}</span>
            </div>
          </div>
        </div>
      );
    },
  });
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

function useData() {
  const [start, end] = useMemo(() => {
    const today = Temporal.Now.zonedDateTimeISO(tz).startOfDay();
    const endOfDay = today.add(Temporal.Duration.from({ days: 1 }));
    return [today.epochMilliseconds, endOfDay.epochMilliseconds];
  }, []);
  const res = Result.use({
    fn: () => db.record.count.record(start, end),
    key: "total-transactions",
    revalidateOn: {
      unmount: true,
    },
  });
  return res;
}
