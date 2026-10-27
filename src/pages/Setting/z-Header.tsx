import { LogOut } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useUser } from "~/hooks/use-user";
import { capitalize } from "~/lib/utils";
import type { Role } from "~/services/cashier";
import { useLogout } from "./use-logout";

/** What each stored role is called on screen. */
const roleLabel: Record<Role, string> = { admin: "Admin", user: "Kasir" };

/**
 * Who is signed in, and the way out.
 *
 * The topbar already prints "Pengaturan" at `text-2xl`, so this is not a title
 * slide: it is the session band. The monogram is the name's own first letter and
 * the tile stays neutral, because nothing about a person is a status colour.
 */
export function Header() {
  const user = useUser();
  const handleLogout = useLogout();
  const name = capitalize(user.name);

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden="true"
          className="flex size-12 shrink-0 items-center justify-center rounded-md border bg-secondary text-base font-semibold"
        >
          {name.charAt(0)}
        </span>
        <div className="flex min-w-0 flex-col">
          <p className="truncate text-base font-semibold">{name}</p>
          <p className="text-sm text-muted-foreground">Masuk sebagai {roleLabel[user.role]}</p>
        </div>
      </div>
      <Button variant="outline" onClick={handleLogout}>
        <LogOut aria-hidden="true" />
        Keluar
      </Button>
    </header>
  );
}
