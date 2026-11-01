import { Outlet } from "react-router";
import { Toaster } from "~/components/ui/sonner";
import { BottomRail } from "~/components/sync/z-Rail";
import { Loader, useStream } from "~/components/Loader";
import { service } from "~/services";
import Redirect from "~/components/Redirect";
import { Topbar } from "./z-Topbar";
import { useNavigationShortcuts } from "./use-navigation-shortcuts";
import { useFlushOnExit } from "./use-flush-on-exit";

export default function Layout() {
  useNavigationShortcuts();
  useFlushOnExit();
  const auth = useStream(service.auth.changes);

  return (
    <Loader res={auth}>
      {({ data: user }) =>
        user === null ? (
          <Redirect to="/login" />
        ) : (
          // The shell owns the viewport height, and `#main-body` owns the
          // scrollport. `min-h-screen` here would leave the chain's height
          // *auto*: it is only definite while the page happens to fit, so a
          // long page (`h-full` → `flex-1 min-h-0` → `overflow-y-auto`)
          // silently sizes to its content, is clipped by `overflow-hidden`,
          // and shows no scrollbar at all. `h-dvh` is the same measure `body`
          // and `#root` already use.
          <div className="flex h-dvh flex-col overflow-hidden bg-background">
            <Topbar />
            <div id="main-body" className="flex-1 min-h-0 overflow-y-auto">
              <Outlet />
            </div>
            {/* Outside `#main-body`, so the pill does not scroll with the page. */}
            <BottomRail />
            <Toaster className="toast" />
          </div>
        )
      }
    </Loader>
  );
}
