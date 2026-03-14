import { Wallet } from "lucide-react";
import { StatsCard } from "./z-StatsCard";

export function IncomeCard() {
  return (
    <StatsCard
      label="Pendapatan Hari Ini"
      value="Rp 1.250.000"
      description="+12% dari kemarin"
      icon={Wallet}
      color="text-green-500"
    />
  );
}
