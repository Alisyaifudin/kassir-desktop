import { Clock, CreditCard, LineChart, Package, TrendingUp, type LucideIcon } from "lucide-react";
import { NavLink } from "react-router";
import { cn } from "~/lib/utils";

type Leaf = { to: string; label: string; icon: LucideIcon; end?: boolean };

/**
 * The five faces of the analysis, in the order a shopkeeper asks the questions:
 * what came in, what it earned, what sold, when it was busy, how it was paid.
 */
const LEAVES: Leaf[] = [
  { to: "/analytics", label: "Arus kas", icon: LineChart, end: true },
  { to: "/analytics/laba", label: "Laba", icon: TrendingUp },
  { to: "/analytics/produk", label: "Produk", icon: Package },
  { to: "/analytics/waktu", label: "Waktu", icon: Clock },
  { to: "/analytics/pembayaran", label: "Pembayaran", icon: CreditCard },
];

export function Rail() {
  return (
    <nav aria-label="Bagian analisis" className="flex flex-col gap-1">
      {LEAVES.map((leaf) => (
        <NavLink
          key={leaf.to}
          to={leaf.to}
          end={leaf.end}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-2 rounded-md px-2 py-2 text-small transition-colors",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              isActive
                ? "bg-primary font-medium text-primary-foreground"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )
          }
        >
          <leaf.icon aria-hidden="true" className="icon shrink-0" />
          <span className="truncate">{leaf.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
