import { Wallet } from "lucide-react";
import { BaseFinancialCard } from "./z-BaseFinancialCard";

export function IncomeCard() {
  return (
    <BaseFinancialCard
      label="Pendapatan Hari Ini"
      icon={Wallet}
      color="text-green-500"
      mode="sell"
      queryKey="income-card"
      errorTitle="Gagal memuat pendapatan"
    />
  );
}
