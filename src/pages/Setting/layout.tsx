import { Effect } from "effect";
import { Outlet, useLocation } from "react-router";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { LogOut } from "lucide-react";
import { Show } from "~/components/Show";
import { UserPanel } from "./z-UserPanel";
import { AdminPanel } from "./z-AdminPanel";
import { version } from "~/lib/constants";
import { CashierService } from "~/services/cashier";

const layout = Effect.gen(function* () {
  const cashierService = yield* CashierService;
  return function Layout() {
    const { pathname } = useLocation();
    const hideSidebar = pathname === "/setting";
    const role = cashierService.current.useUser().role;
    const handleLogout = () => {
      cashierService.current.logout();
    };
    return (
      <main
        className={cn(
          "grid gap-2 p-2 flex-1 w-full justify-between overflow-hidden h-[calc(100vh-64px)] small:h-[calc(100vh-48px)]",
          hideSidebar
            ? "grid-cols-1"
            : "grid-cols-1 xl:grid-cols-[300px_1fr] lg:small:grid-cols-[200px_1fr]",
        )}
      >
        {hideSidebar ? null : (
          <nav
            className={cn(
              "w-full flex-1 py-2 pr-2",
              "overflow-y-auto h-full hidden xl:flex lg:small:flex flex-col justify-between gap-4",
            )}
          >
            <div className="flex flex-col gap-3">
              <Show when={role === "admin"} fallback={<UserPanel />}>
                <AdminPanel />
              </Show>
            </div>
            <div className="flex flex-col gap-1 mt-auto pb-4">
              <Button onClick={handleLogout}>
                Keluar
                <LogOut />
              </Button>
              <p>Versi {version}</p>
            </div>
          </nav>
        )}
        <div className={cn("overflow-y-auto h-full pr-2 small:pr-0", { "pr-0": hideSidebar })}>
          <Outlet />
        </div>
      </main>
    );
  };
});

export default layout;
