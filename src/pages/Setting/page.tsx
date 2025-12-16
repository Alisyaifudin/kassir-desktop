import { Form, Outlet, useNavigation } from "react-router";
import { Button } from "~/components/ui/button";
import { cn, version } from "~/lib/utils";
import { Loader2, LogOut } from "lucide-react";
import { Show } from "~/components/Show";
import { UserPanel } from "./UserPanel";
import { AdminPanel } from "./AdminPanel";
import { grid } from "./style.css";
import { useSize } from "~/hooks/use-size";
import { auth } from "~/lib/auth";

export default function Page() {
  const size = useSize();
  return (
    <main
      className={cn("grid gap-2 p-2 flex-1 w-full justify-between overflow-hidden", grid[size])}
    >
      <Navigation />
      <Outlet />
    </main>
  );
}

function Navigation() {
  const navigation = useNavigation();
  const role = auth.user().role;
  const loading = navigation.state === "submitting";
  return (
    <nav className="w-full h-full flex py-1 flex-col justify-between overflow-auto">
      <Show when={role === "admin"} fallback={<UserPanel />}>
        <AdminPanel />
      </Show>
      <Form method="POST" className="flex flex-col gap-1">
        <Button type="submit">
          <Show when={loading}>
            <Loader2 className="animate-splin" />
          </Show>
          Keluar
          <LogOut />
        </Button>
        <p>Versi {version}</p>
        {/* <Update /> */}
      </Form>
    </nav>
  );
}
