import { Outlet } from "react-router";
import { Toaster } from "~/components/ui/sonner";
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
          <div className="flex flex-col min-h-screen bg-background overflow-hidden">
            <Topbar />
            <div id="main-body" className="flex-1 overflow-hidden">
              <Outlet />
            </div>
            <Toaster className="toast" />
          </div>
        )
      }
    </Loader>
  );
}
