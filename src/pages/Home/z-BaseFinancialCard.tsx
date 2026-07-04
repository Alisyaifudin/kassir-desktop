import { LucideIcon, AlertCircle } from "lucide-react";
import { StatsCard } from "./z-StatsCard";
import { Effect } from "effect";
import { Skeleton } from "~/components/ui/skeleton";
import { Sign } from "~/services/daily-summary";
import { WithLoader } from "~/components/WithLoader";
import { DailySummaryError } from "~/services/daily-summary/error";

interface BaseFinancialCardProps {
  label: string;
  icon: LucideIcon;
  color: string;
  errorTitle: string;
  loader: () => Effect.Effect<
    {
      diffPercent?: number;
      sign: Sign;
      todayValue: number;
    },
    DailySummaryError,
    never
  >;
}

export function BaseFinancialCard({
  label,
  icon,
  color,
  errorTitle,
  loader,
}: BaseFinancialCardProps) {
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
}

export function Loading() {
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
