import { IncomeCard } from "./z-IncomeCard";
import { TotalTransactionsCard } from "./z-TotalTransactionsCard";
import { ExpenseCard } from "./z-ExpenseCard";

export function StatsGrid() {
  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mb-8">
      <IncomeCard />
      <TotalTransactionsCard />
      <ExpenseCard />
    </div>
  );
}
