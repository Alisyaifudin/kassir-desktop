import { Link, useLocation } from "react-router";
import { cn } from "~/lib/utils";
import type { NavItem } from "./util-nav";

export function NavCard({ item, index = 0 }: { item: NavItem; index?: number }) {
  const { pathname } = useLocation();
  const to = `${item.path}?${new URLSearchParams({ url_back: pathname })}`;
  const Icon = item.icon;
  return (
    <Link
      to={to}
      style={{ animationDelay: `${index * 40}ms` }}
      className={cn(
        "group flex items-center gap-4 rounded-2xl border bg-card p-4 small:p-3",
        "animate-in fade-in slide-in-from-bottom-2 fill-mode-backwards duration-300",
        "transition-all hover:bg-accent hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
      )}
    >
      <div
        className={cn(
          "flex size-14 small:size-12 shrink-0 items-center justify-center rounded-2xl transition-transform group-hover:scale-110",
          item.color,
        )}
      >
        <Icon className="size-7 small:size-6" />
      </div>
      <div className="flex flex-col gap-0.5">
        <h3 className="text-big font-bold tracking-tight">{item.label}</h3>
        <p className="text-muted-foreground text-normal small:text-small">{item.description}</p>
      </div>
    </Link>
  );
}
