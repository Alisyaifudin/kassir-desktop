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
        "grid gap-2 p-2 flex-1 w-full justify-between overflow-hidden",
        "grid-cols-[300px_1fr] small:grid-cols-[180px_1fr]",
      )}
    >
      <Navigation />
      <Outlet />
    </main>
  );
}

function Navigation() {
  const role = useUser().role;
  const handleLogout = useLogout();
  return (
    <nav className="w-full h-full flex py-1 gap-0.5 flex-col justify-between overflow-auto">
      <Show when={role === "admin"} fallback={<UserPanel />}>
        <AdminPanel />
      </Show>
      <div className="flex flex-col gap-1">
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
