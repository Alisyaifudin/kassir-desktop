import { LogOut } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useDeviceId } from "~/hooks/use-device-id";
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
 *
 * The device id is the one piece of machine identity in this block, and it is here
 * because this is where a shop is asked to look: when sync misbehaves, the server's
 * log can name a till by this id (kassir-backend/docs/LOGS.md), and reading it off
 * the screen is faster than any query. It is not a secret — an opaque install id —
 * so it is shown to cashiers too, and `select-all` makes a single click select the
 * whole value for a screenshot or a phone call.
 */
export function Header() {
  const user = useUser();
  const handleLogout = useLogout();
  const name = capitalize(user.name);

  // Minted on first read: a device that has never synced still has an id to read
  // out, which is exactly the case support needs it in.
  const deviceId = useDeviceId();

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
          {deviceId !== null && (
            // Truncated rather than wrapped: a UUID broken across two lines is
            // harder to transcribe than one cut short, and `title` still shows the
            // whole value. Selecting the element copies the full id regardless.
            <p className="mt-1 flex min-w-0 items-baseline gap-1.5 text-xs text-muted-foreground">
              <span className="shrink-0">ID perangkat</span>
              <span className="truncate font-mono select-all" title={deviceId}>
                {deviceId}
              </span>
            </p>
          )}
        </div>
      </div>
      <Button variant="outline" onClick={handleLogout}>
        <LogOut aria-hidden="true" />
        Keluar
      </Button>
    </header>
  );
}
