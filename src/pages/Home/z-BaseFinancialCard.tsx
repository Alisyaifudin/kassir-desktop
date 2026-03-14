import { LucideIcon, AlertCircle } from "lucide-react";
import { StatsCard } from "./z-StatsCard";
import { useMemo } from "react";
import { Temporal } from "temporal-polyfill";
import { Result } from "~/lib/result";
import { Effect } from "effect";
import { db } from "~/database";
import { log } from "~/lib/log";
import { Skeleton } from "~/components/ui/skeleton";
import { tz } from "~/lib/constants";

interface BaseFinancialCardProps {
  label: string;
  icon: LucideIcon;
  color: string;
  mode: "sell" | "buy";
  queryKey: string;
  errorTitle: string;
}

export function BaseFinancialCard({
  label,
  icon,
  color,
  mode,
  queryKey,
  errorTitle,
}: BaseFinancialCardProps) {
  const res = useData(mode, queryKey);
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
            <span className="font-medium text-sm">{errorTitle}</span>
          </div>
          <p className="text-xs text-destructive/80 line-clamp-2">{e.message}</p>
        </div>
      );
    },
    onSuccess([today, yesterday]) {
      const todayValue = today.toLocaleString("id-ID");
      const diff = today - yesterday;
      const diffPercent = yesterday === 0 ? null : Math.abs((diff / yesterday) * 100).toFixed(1);
      const sign = diff >= 0 ? "+" : "-";

      return (
        <StatsCard
          label={label}
          value={`Rp ${todayValue}`}
          description={diffPercent === null ? "" : `${sign}${diffPercent}% dari kemarin`}
          icon={icon}
          color={color}
        />
      );
    },
  });
}

function Loading() {
  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-card p-6 shadow-sm h-full">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-5 w-5 rounded-full" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  );
}

function useData(mode: "sell" | "buy", queryKey: string) {
  const { today, yesterday } = useMemo(() => {
    const today = Temporal.Now.zonedDateTimeISO(tz).startOfDay();
    const endOfToday = today.add(Temporal.Duration.from({ days: 1 }));
    const startOfYesterday = today.subtract(Temporal.Duration.from({ days: 1 }));

    return {
      today: { start: today.epochMilliseconds, end: endOfToday.epochMilliseconds },
      yesterday: { start: startOfYesterday.epochMilliseconds, end: today.epochMilliseconds },
    };
  }, []);

  return Result.use({
    fn: () =>
      Effect.all([
        db.record.count.total(today.start, today.end, mode),
        db.record.count.total(yesterday.start, yesterday.end, mode),
      ]),
    key: queryKey,
    revalidateOn: {
      unmount: true,
    },
  });
}
