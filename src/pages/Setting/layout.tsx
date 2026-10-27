import { Outlet, useLocation } from "react-router";
import { cn } from "~/lib/utils";
import { NavPanel } from "./z-NavPanel";

/**
 * The settings shell. One tinted canvas with a single scrollport for the screen
 * on the right; the sidebar is the only thing that stays put, and the hub hides
 * it because the hub *is* the list.
 *
 * Below `xl` the sidebar is gone and the topbar's back button is the way to the
 * hub — the same as the rest of the app, no drawer to open and close.
 */
export default function Layout() {
  const { pathname } = useLocation();
  const isHub = pathname === "/setting";

  return (
    <main
      className={cn(
        "grid w-full flex-1 overflow-hidden bg-muted/50",
        "h-[calc(100vh-48px)]",
        isHub
          ? "grid-cols-1"
          : "grid-cols-1 xl:grid-cols-[264px_1fr] lg:",
      )}
    >
      {isHub ? null : <NavPanel />}
      <div className="scroll-gutter h-full overflow-y-auto">
        <Outlet />
      </div>
    </main>
  );
}
