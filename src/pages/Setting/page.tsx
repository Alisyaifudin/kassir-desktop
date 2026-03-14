import { Outlet } from "react-router";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { LogOut } from "lucide-react";
import { Show } from "~/components/Show";
import { UserPanel } from "./z-UserPanel";
import { AdminPanel } from "./z-AdminPanel";
import { version } from "~/lib/constants";
import { useLogout } from "./use-logout";
import { useUser } from "~/hooks/use-user";

export default function Page() {
  return (
    <main
      className={cn(
        "grid gap-2 p-2 flex-1 w-full justify-between overflow-hidden h-[calc(100vh-64px)] small:h-[calc(100vh-48px)]",
        "grid-cols-[300px_1fr] small:grid-cols-[180px_1fr]",
      )}
    >
      <Navigation />
      <div className="overflow-y-auto h-full pr-2">
        <Outlet />
      </div>
    </main>
  );
}

function Navigation() {
  const role = useUser().role;
  const handleLogout = useLogout();
  return (
    <nav className="w-full flex-1 flex py-1 gap-4 flex-col justify-between overflow-y-auto h-full pr-2">
      <div className="flex flex-col gap-0.5">
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
        {/* <Update /> */}
      </div>
    </nav>
  );
}
