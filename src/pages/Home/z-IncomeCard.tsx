import { Wallet } from "lucide-react";
import type { Stats } from "./use-stats";
import { BaseFinancialCard } from "./z-BaseFinancialCard";

export function IncomeCard({ stats }: { stats: Stats }) {
  return (
    <BaseFinancialCard
      label="Pendapatan Hari Ini"
      icon={Wallet}
      color="text-green-500"
      value={stats.today.outcoming.total}
      previous={stats.yesterday.outcoming.total}
    />
  );
}
