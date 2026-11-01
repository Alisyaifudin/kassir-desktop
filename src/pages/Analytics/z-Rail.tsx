import { Clock, CreditCard, LineChart, Package, TrendingUp, type LucideIcon } from "lucide-react";
import { NavLink, useLocation } from "~/services/route/react";
import { cn } from "~/lib/utils";
import { rangeQuery } from "./use-range";

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
  // The period belongs to the screen, not to a face: carry it across a switch.
  const query = rangeQuery(useLocation().search);

  return (
    <nav aria-label="Bagian analisis" className="flex flex-col gap-1">
      {LEAVES.map((leaf) => (
        <NavLink
          key={leaf.to}
          to={{ pathname: leaf.to, search: query }}
          end={leaf.end}
          // One screen's faces: `Back` leaves Analytics, it does not walk the rail
          // the operator clicked through.
          behavior="replace"
          className={({ isActive }) =>
            cn(
              "flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              isActive
                ? "bg-primary font-medium text-primary-foreground"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )
          }
        >
          <leaf.icon aria-hidden="true" className="size-5 shrink-0" />
          <span className="truncate">{leaf.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
