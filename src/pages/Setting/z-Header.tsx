import { LogOut } from "lucide-react";
import { useUser } from "~/hooks/use-user";
import { capitalize } from "~/lib/utils";
import { useLogout } from "./use-logout";

export function Header() {
  const user = useUser();
  const handleLogout = useLogout();
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-big font-bold tracking-tight">Pengaturan</h1>
        <p className="text-muted-foreground text-normal small:text-small">
          Masuk sebagai {capitalize(user.name)} ({user.role})
        </p>
      </div>
      <button
        onClick={handleLogout}
        type="button"
        className="group flex items-center gap-3 rounded-2xl border bg-card p-3 small:p-2 text-destructive transition-all hover:bg-accent hover:shadow-md"
      >
        <div className="flex size-10 small:size-8 items-center justify-center rounded-xl bg-destructive/10">
          <LogOut className="size-5 small:size-4" />
        </div>
        <span className="font-bold">Keluar</span>
      </button>
    </header>
  );
}
