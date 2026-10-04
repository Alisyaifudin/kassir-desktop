import { CreditCard } from "lucide-react";
import type { Stats } from "./use-stats";
import { BaseFinancialCard } from "./z-BaseFinancialCard";

export function ExpenseCard({ stats }: { stats: Stats }) {
  return (
    <BaseFinancialCard
      label="Pengeluaran Hari Ini"
      icon={CreditCard}
      color="text-red-500"
      value={stats.today.incoming.total}
      previous={stats.yesterday.incoming.total}
    />
  );
}
