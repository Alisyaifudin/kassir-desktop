import { BarChart3 } from "lucide-react";
import { StatsCard } from "./z-StatsCard";

export function TotalTransactionsCard() {
  return (
    <StatsCard
      label="Total Transaksi"
      value="42"
      description="+5 dari kemarin"
      icon={BarChart3}
      color="text-blue-500"
    />
  );
}
