import { LucideIcon } from "lucide-react";
import { Link, useLocation } from "react-router";
import { cn } from "~/lib/utils";

interface NavCardProps {
  label: string;
  path: string;
  icon: LucideIcon;
  description: string;
  color?: string;
  className?: string;
}

export function NavCard({
  label,
  path,
  icon: Icon,
  description,
  color = "bg-primary/10 text-primary",
  className,
}: NavCardProps) {
  const { pathname } = useLocation();
  const search = new URLSearchParams();
  search.set("url_back", pathname);
  const to = `${path}?${search.toString()}`;

  return (
    <Link
      to={to}
      className={cn(
        "group flex flex-col items-center justify-center gap-4 rounded-2xl border bg-card p-8 text-center transition-all hover:bg-accent hover:shadow-md",
        className,
      )}
    >
      <div
        className={cn(
          "flex h-16 w-16 items-center justify-center rounded-2xl transition-transform group-hover:scale-110",
          color,
        )}
      >
        <Icon size={32} />
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="text-big font-bold tracking-tight">{label}</h3>
        <p className="text-muted-foreground">{description}</p>
      </div>
    </Link>
  );
}
