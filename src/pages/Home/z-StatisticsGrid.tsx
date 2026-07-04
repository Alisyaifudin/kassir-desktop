import { CreditCard, Wallet } from "lucide-react";
import { TotalTransactionsCard } from "./z-TotalTransactionsCard";
import { Effect } from "effect";
import { BaseFinancialCard } from "./z-BaseFinancialCard";
import { Sign } from "~/services/daily-summary";
import { DailySummaryError } from "~/services/daily-summary/error";

type Props = {
  incomeLoader: () => Effect.Effect<
    {
      diffPercent?: number;
      sign: Sign;
      todayValue: number;
    },
    DailySummaryError,
    never
  >;
  expenseLoader: () => Effect.Effect<
    {
      diffPercent?: number;
      sign: Sign;
      todayValue: number;
    },
    DailySummaryError,
    never
  >;
  totalTransactionLoader: () => Effect.Effect<
    {
      in: number;
      out: number;
    },
    DailySummaryError,
    never
  >;
};

export function StatisticsGrid({ incomeLoader, expenseLoader, totalTransactionLoader }: Props) {
  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mb-8">
      <BaseFinancialCard
        label="Pendapatan Hari Ini"
        icon={Wallet}
        color="text-green-500"
        errorTitle="Gagal memuat pendapatan"
        loader={incomeLoader}
      />
      <BaseFinancialCard
        label="Pengeluaran Hari Ini"
        icon={CreditCard}
        color="text-red-500"
        errorTitle="Gagal memuat pengeluaran"
        loader={expenseLoader}
      />
      <TotalTransactionsCard loader={totalTransactionLoader} />
    </div>
  );
}
