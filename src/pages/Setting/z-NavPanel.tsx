import { LogOut } from "lucide-react";
import { Link, useLocation } from "react-router";
import { Button } from "~/components/ui/button";
import { version } from "~/lib/constants";
import { cn } from "~/lib/utils";
import { useLogout } from "./use-logout";
import { useNav } from "./use-nav";

/**
 * The detail pages' own navigation: the hub's list, narrower, so a person who
 * landed on `/setting/profile` from the topbar or a bookmark still sees where
 * else they could be.
 *
 * There is no card around it — the tinted canvas is the container, and a card
 * holding a list of links inside a page that is not a card reads as nesting. The
 * current page is a white row with a hairline, the glyph turning `active` blue:
 * the same "you are here" the app uses everywhere else.
 */
export function NavPanel() {
  const { items } = useNav();
  const { pathname } = useLocation();
  const handleLogout = useLogout();

  return (
    <nav className="hidden h-full w-full flex-col justify-between gap-4 px-3 py-3 xl:flex lg:">
      <ol className="flex flex-col gap-1">
        {items.map(({ path, label, icon: Icon }) => {
          const isActive = pathname === path;
          const to = `${path}?${new URLSearchParams({ url_back: "/setting" })}`;
          return (
            <li key={path}>
              <Link
                to={to}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-md border px-3 py-2 transition-colors",
                  "focus-visible:ring-2 focus-visible:ring-active focus-visible:outline-none",
                  isActive
                    ? "border-border bg-card font-medium"
                    : "border-transparent hover:bg-card/60",
                )}
              >
                <Icon
                  aria-hidden="true"
                  className={cn(
                    "size-5 shrink-0",
                    isActive ? "text-active" : "text-muted-foreground",
                  )}
                />
                {label}
              </Link>
            </li>
          );
        })}
      </ol>
      <div className="flex flex-col gap-2 border-t pt-3">
        <Button variant="outline" onClick={handleLogout}>
          Keluar
          <LogOut aria-hidden="true" />
        </Button>
        <p className="text-sm text-muted-foreground">Versi {version}</p>
      </div>
    </nav>
  );
}
