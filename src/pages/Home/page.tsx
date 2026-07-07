import { Effect } from "effect";
import { DailySummaryService } from "~/services/daily-summary";
import { UserService } from "~/services/user";
import { Header } from "./z-header";
import { StatisticsGrid } from "./z-StatisticsGrid";
import { NavGrid } from "./z-NavGrid";
import { DateService } from "~/services/date";

const page = Effect.gen(function* () {
  const userService = yield* UserService;
  const dailySummaryService = yield* DailySummaryService;
  const dateService = yield* DateService;
  const expenseLoader = () => dailySummaryService.total("out");
  const incomeLoader = () => dailySummaryService.total("in");
  const getToday = () => dateService.today.str();
  return function Page() {
    return (
      <div className="h-[calc(100vh-64px)] small:h-[calc(100vh-48px)] overflow-y-auto overflow-x-hidden w-full">
        <div className="container mx-auto py-8 px-4 max-w-7xl animate-in fade-in duration-500 pb-20">
          <Header getToday={getToday} useUser={userService.useUser} />
          <StatisticsGrid
            expenseLoader={expenseLoader}
            incomeLoader={incomeLoader}
            totalTransactionLoader={dailySummaryService.count}
          />
          <div className="flex items-center gap-2 mb-4">
            <div className="h-1 w-8 bg-primary rounded-full" />
            <h2 className="text-big font-bold tracking-tight">Navigasi Utama</h2>
          </div>
          <NavGrid useUser={userService.useUser} />
        </div>
      </div>
    );
  };
});

export default page;
