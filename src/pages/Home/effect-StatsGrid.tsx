import { incomeCard } from "./effect-IncomeCard";
import { totalTransactionsCard } from "./effect-TotalTransactionsCard";
import { expenseCard } from "./effect-ExpenseCard";
import { Effect } from "effect";

export const statsGrid = Effect.gen(function* () {
  const IncomeCard = yield* incomeCard;
  const ExpenseCard = yield* expenseCard;
  const TotalTransactionsCard = yield* totalTransactionsCard;
  return function StatsGrid() {
    return (
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <IncomeCard />
        <ExpenseCard />
        <TotalTransactionsCard />
      </div>
    );
  };
});
