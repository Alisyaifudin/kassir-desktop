import { Link, useLocation } from "react-router";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { useNav } from "./use-nav";

/** Desktop sidebar listing every settings destination the user can open. */
export function NavPanel() {
  const { items } = useNav();
  const { pathname } = useLocation();
  return (
    <ol className="flex flex-col gap-1 rounded-2xl border bg-card p-2 shadow-sm">
      {items.map(({ path, label, icon: Icon }) => {
        const isActive = pathname === path;
        const to = `${path}?${new URLSearchParams({ url_back: "/setting" })}`;
        return (
          <li key={path} className="flex items-center">
            <Button
              className={cn("w-full justify-start gap-3 rounded-xl", isActive ? "" : "text-foreground")}
              asChild
              variant={isActive ? "secondary" : "ghost"}
            >
              <Link to={to}>
                <Icon className="icon" />
                {label}
              </Link>
            </Button>
          </li>
        );
      })}
    </ol>
  );
}
