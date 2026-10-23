import type { ReactNode } from "react";
import { Skeleton } from "~/components/ui/skeleton";

/**
 * Static chrome for every widget: title, the contract it reads, and a box that
 * is already on screen. Only what is inside `children` is ever gated, which is
 * the whole point of the pattern — the page's shape never pops in.
 */
export function Card({
  title,
  contract,
  children,
}: {
  title: string;
  contract: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2 rounded-xl border bg-background p-3">
      <header className="flex flex-wrap items-baseline justify-between gap-x-2">
        <h2 className="text-normal font-semibold">{title}</h2>
        <code className="text-small text-muted-foreground">{contract}</code>
      </header>
      <div className="min-h-16">{children}</div>
    </section>
  );
}

/** The shape of a widget's body while its key is in flight. */
export function Rows({ rows = 2 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2" aria-busy="true" aria-label="Memuat data">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-5 w-full" />
      ))}
    </div>
  );
}
