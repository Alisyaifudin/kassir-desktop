import { CreditCard } from "lucide-react";
import { BaseFinancialCard } from "./z-BaseFinancialCard";

export function ExpenseCard() {
  return (
    <BaseFinancialCard
      label="Pengeluaran Hari Ini"
      icon={CreditCard}
      color="text-red-500"
      mode="buy"
      queryKey="expense-card"
      errorTitle="Gagal memuat pengeluaran"
    />
  );
}
