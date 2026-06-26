import { CreditCard } from "lucide-react";
import { baseFinancialCard } from "./effect-BaseFinancialCard";
import { Effect } from "effect";

export const expenseCard = Effect.gen(function* () {
  const BaseFinancialCard = yield* baseFinancialCard("out");
  return function ExpenseCard() {
    return (
      <BaseFinancialCard
        label="Pengeluaran Hari Ini"
        icon={CreditCard}
        color="text-red-500"
        errorTitle="Gagal memuat pengeluaran"
      />
    );
  };
});
