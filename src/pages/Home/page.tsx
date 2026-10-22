import { Day } from "./z-Day";
import { Header } from "./z-Header";
import { Menu } from "./z-Menu";

/**
 * Beranda is a workspace, not a launcher page: who is on, the day's three
 * figures, the transactions behind them, the pockets, and the menu underneath.
 */
export default function Page() {
  return (
    <main className="h-[calc(100vh-64px)] w-full overflow-y-auto overflow-x-hidden bg-muted/50 small:h-[calc(100vh-48px)]">
      <div className="flex w-full flex-col gap-4 px-6 py-6 pb-12 small:gap-3 small:px-3 small:py-3">
        <Header />
        <Day />
        <Menu />
      </div>
    </main>
  );
}
