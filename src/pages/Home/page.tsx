import { Stream } from "effect";
import { useMemo } from "react";
import { useDayStart } from "~/hooks/use-day-start";
import { useUser } from "~/hooks/use-user";
import { cn } from "~/lib/utils";
import { service } from "~/services";
import { pageData } from "./data";
import { daySources } from "./day";
import { Header } from "./z-Header";
import { Ledger } from "./z-Ledger";
import { Menu } from "./z-Menu";
import { Band } from "./z-Stats";
import { Uang } from "./z-Uang";

/**
 * Beranda is a workspace, not a launcher page: who is on, the day's three
 * figures, the transactions behind them, the pockets, and the menu underneath.
 *
 * Only the figures, the ledger rows and the pocket list wait for anything. The
 * header, the menu, both card frames and their actions paint on the first frame,
 * and the six keys below are subscribed together — the pockets no longer queue
 * behind the day, because there is no longer a `Loader` between them.
 */
export default function Page() {
  const dayStart = useDayStart();
  const role = useUser().role;
  const isAdmin = role === "admin";

  const sources = useMemo(
    () => ({
      ...daySources(dayStart),
      // A cashier must not be able to read the till's balances from Beranda
      // (`/money` redirects them), so the key is left unsubscribed instead of
      // read and hidden.
      pockets: isAdmin ? service.money.pockets.get.changes : Stream.empty,
    }),
    [dayStart, isAdmin],
  );

  return (
    <pageData.Provider sources={sources} deps={[dayStart, role]}>
      <main className="h-[calc(100vh-64px)] w-full overflow-x-hidden overflow-y-auto bg-muted/50 small:h-[calc(100vh-48px)]">
        <div className="flex w-full flex-col gap-4 px-6 py-6 pb-12 small:gap-3 small:px-3 small:py-3">
          <Header dayStart={dayStart} />
          <div className="flex flex-col gap-4">
            <Band />
            <div
              className={cn(
                "grid items-start gap-4",
                isAdmin && "xl:grid-cols-[minmax(0,1fr)_clamp(320px,38%,540px)]",
              )}
            >
              <Ledger />
              {isAdmin ? <Uang /> : null}
            </div>
          </div>
          <Menu />
        </div>
      </main>
    </pageData.Provider>
  );
}
