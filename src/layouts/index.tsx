import { Outlet } from "react-router";
import { Toaster } from "~/components/ui/sonner";
import { useNavigationShortcuts } from "./use-navigation-shortcuts";
import { Effect } from "effect";
import { topbar } from "./effect-topbar";

const layout = Effect.gen(function* () {
  const Topbar = yield* topbar;

  return function Layout() {
    useNavigationShortcuts();

    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Topbar />
        <div id="main-body" className="flex-1">
          <Outlet />
        </div>
        <Toaster className="toast" />
        {/* <SyncFloating /> */}
      </div>
    );
  };
});

export default layout;
