import { CreditCard } from "lucide-react";
import { StatsCard } from "./z-StatsCard";

export function ExpenseCard() {
  return (
    <StatsCard
      label="Pengeluaran Hari Ini"
      value="Rp 450.000"
      description="+8% dari kemarin"
      icon={CreditCard}
      color="text-red-500"
    />
  );
}
