import type { ReactNode } from "react";
import { Link } from "react-router";
import { cn } from "~/lib/utils";

/**
 * The panel every region on Beranda sits in: white card on the tinted page
 * canvas, one hairline border, no shadow. Elevation stays reserved for controls
 * (see DESIGN.md); the border plus the canvas tint is what makes the page read
 * as a workspace instead of a sheet of paper.
 */
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section
      className={cn("flex min-w-0 flex-col overflow-hidden rounded-xl border bg-card", className)}
    >
      {children}
    </section>
  );
}

/** A card's title line, with the one action that belongs to it at the far edge. */
export function CardHead({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-2">
      <h2 className="text-sm font-semibold">{title}</h2>
      {action}
    </div>
  );
}

/** The quiet action a card head carries: "Kelola", "Riwayat", "Lihat". */
export function CardLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="shrink-0 rounded-sm text-sm text-muted-foreground underline-offset-4 hover:text-active hover:underline focus-visible:ring-2 focus-visible:ring-active focus-visible:ring-inset focus-visible:outline-none"
    >
      {children}
    </Link>
  );
}
