import { Building2, User, Database, ScrollText, Printer } from "lucide-react";
import { Link, useLocation } from "react-router";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

export function AdminPanel() {
  const items = [
    { path: "/setting/shop", label: "Toko", icon: Building2 },
    { path: "/setting/profile", label: "Profil", icon: User },
    { path: "/setting/data", label: "Data", icon: Database },
    { path: "/setting/printer", label: "Printer", icon: Printer },
    { path: "/setting/log", label: "Log", icon: ScrollText },
  ] as const;
  return (
    <ol className="flex flex-col gap-1 rounded-2xl border bg-card p-2 shadow-sm">
      {items.map((item) => (
        <NavLink key={item.path} path={item.path} icon={item.icon}>
          {item.label}
        </NavLink>
      ))}
    </ol>
  );
}

function NavLink({
  path,
  children,
  icon: Icon,
}: {
  path: string;
  children: string;
  icon: typeof Building2;
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
