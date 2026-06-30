import { LucideIcon, AlertCircle } from "lucide-react";
import { StatsCard } from "./z-StatsCard";
import { Effect } from "effect";
import { Skeleton } from "~/components/ui/skeleton";
import { DailySummaryService } from "~/services/daily-summary";
import { WithLoader } from "~/components/WithLoader";

interface BaseFinancialCardProps {
  label: string;
  icon: LucideIcon;
  color: string;
  errorTitle: string;
}

function ErrorComp({ title, children }: { title: string; children: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-destructive/50 bg-destructive/5 p-6 shadow-sm h-full justify-center">
      <div className="flex items-center gap-2 text-destructive">
        <AlertCircle size={20} />
        <span className="font-medium text-sm">{title}</span>
      </div>
      <p className="text-xs text-destructive/80 line-clamp-2">{children}</p>
    </div>
  );
}

export const baseFinancialCard = (mode: DBNamespace.Mode) =>
  Effect.gen(function* () {
    const agg = yield* DailySummaryService;
    const loader = agg.total(mode);
    return function BaseFinancialCard({ label, icon, color, errorTitle }: BaseFinancialCardProps) {
      return (
        <WithLoader
          loader={loader}
          loading={<Loading />}
          error={({ e }) => <ErrorComp title={errorTitle}>{e.message}</ErrorComp>}
        >
          {({ diffPercent, sign, todayValue }) => (
            <StatsCard
              label={label}
              value={`Rp ${todayValue}`}
              description={diffPercent === undefined ? "" : `${sign}${diffPercent}% dari kemarin`}
              icon={icon}
              color={color}
            />
          )}
        </WithLoader>
      );
    };
  });

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

// const program = (mode: DBNamespace.Mode) =>
//   Effect.gen(function* () {
//     const db = yield* DBService;
//     const time = yield* getTime;
//     const [today, yesterday] = yield* Effect.all(
//       [
//         db.record.count.total(time.today.start, time.today.end, mode),
//         db.record.count.total(time.yesterday.start, time.yesterday.end, mode),
//       ],
//       { concurrency: "unbounded" },
//     );
//     const todayValue = today.toLocaleString("id-ID");
//     const diff = today - yesterday;
//     const diffPercent = yesterday === 0 ? undefined : Math.abs((diff / yesterday) * 100).toFixed(1);
//     const sign = diff >= 0 ? "+" : "-";
//     return { todayValue, sign, diffPercent };
//   }).pipe(Effect.tapError(LogPut));

// const getTime = Effect.sync(() => {
//   const today = Temporal.Now.zonedDateTimeISO(tz).startOfDay();
//   const endOfToday = today.add(Temporal.Duration.from({ days: 1 }));
//   const startOfYesterday = today.subtract(Temporal.Duration.from({ days: 1 }));

//   return {
//     today: { start: today.epochMilliseconds, end: endOfToday.epochMilliseconds },
//     yesterday: { start: startOfYesterday.epochMilliseconds, end: today.epochMilliseconds },
//   };
// });
