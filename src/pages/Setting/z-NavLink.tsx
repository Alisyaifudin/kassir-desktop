import { LucideIcon } from "lucide-react";
import { Link, useLocation } from "react-router";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

export function NavLink({
  path,
  children,
  icon: Icon,
}: {
  path: string;
  children: string;
  icon: LucideIcon;
}) {
  const { pathname } = useLocation();
  const isActive = pathname === path;
  const to = `${path}?url_back=${encodeURIComponent("/setting")}`;
  return (
    <li className="flex items-center">
      <Button
        className={cn("w-full justify-start gap-3 rounded-xl", isActive ? "" : "text-foreground")}
        asChild
        variant={isActive ? "secondary" : "ghost"}
      >
        <Link to={to}>
          <Icon className="icon" />
          {children}
        </Link>
      </Button>
    </li>
  );
}
