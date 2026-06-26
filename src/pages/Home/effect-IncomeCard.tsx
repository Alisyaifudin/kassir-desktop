import { Wallet } from "lucide-react";
import { baseFinancialCard } from "./effect-BaseFinancialCard";
import { Effect } from "effect";

export const incomeCard = Effect.gen(function* () {
  const BaseFinancialCard = yield* baseFinancialCard("in");
  return function IncomeCard() {
    return (
      <BaseFinancialCard
        label="Pendapatan Hari Ini"
        icon={Wallet}
        color="text-green-500"
        errorTitle="Gagal memuat pendapatan"
      />
    );
  };
});
