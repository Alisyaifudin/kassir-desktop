import { Outlet } from "react-router";
import { Toaster } from "~/components/ui/sonner";
import { Topbar } from "./z-Topbar";
import { useNavigationShortcuts } from "./use-navigation-shortcuts";

export default function Layout() {
  useNavigationShortcuts();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Topbar />
      <div id="main-body" className="flex-1">
        <Outlet />
      </div>
      <Toaster className="toast" />
    </div>
  );
}
