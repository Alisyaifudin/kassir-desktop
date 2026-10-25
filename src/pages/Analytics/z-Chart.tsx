import { useSize } from "~/hooks/use-size";
import { cn } from "~/lib/utils";
import { rupiah } from "~/components/cart/util-rupiah";

/**
 * The chart vocabulary the analytics pages share: one frame per chart, one
 * tooltip, one axis geometry, one palette. It mirrors the product performance
 * charts (SVG attributes cannot read CSS variables, and the app never applies
 * `.dark`, so concrete colours are correct today).
 */
export const COLORS = {
  omzet: "#2563eb",
  pengeluaran: "#dc2626",
  laba: "#16a34a",
  net: "#7c3aed",
  muted: "#94a3b8",
} as const;

export const METHOD_COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed"] as const;

export function chartColor(index: number): string {
  return METHOD_COLORS[index % METHOD_COLORS.length] ?? METHOD_COLORS[0];
}

/** Full rupiah, for tooltips and tables. */
export function money(value: number): string {
  return rupiah(value);
}

/** Short rupiah for axis ticks: 1.200.000 → "1,2 jt". */
export function moneyTick(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000)
    return `${(value / 1_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M`;
  if (abs >= 1_000_000)
    return `${(value / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;
  if (abs >= 1_000)
    return `${(value / 1_000).toLocaleString("id-ID", { maximumFractionDigits: 0 })} rb`;
  return value.toLocaleString("id-ID");
}

export function countTick(value: number): string {
  return value.toLocaleString("id-ID");
}

/** Tooltip lands in an inline style, so `var()` is safe there. */
export const TOOLTIP = {
  contentStyle: {
    background: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    color: "var(--popover-foreground)",
  },
  labelStyle: { color: "var(--muted-foreground)" },
  formatter: (value: unknown) => money(Number(value)),
} as const;

export function useChartGeometry() {
  const size = useSize();
  const small = size === "small";
  return {
    tick: { fontSize: small ? 12 : 14 },
    yWidth: small ? 44 : 56,
  };
}

export function ChartFrame({
  title,
  hint,
  action,
  className,
  chartClassName,
  children,
  label,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
  className?: string;
  /** Height of the plot area; a horizontal bar list needs more than a time series. */
  chartClassName?: string;
  children: React.ReactNode;
  /** Accessible name for the canvas area, e.g. "Omzet per hari". */
  label?: string;
}) {
  return (
    <section className={cn("flex min-w-0 flex-col gap-2 rounded-xl border bg-card p-3", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex min-w-0 flex-col">
          <h2 className="text-small font-semibold">{title}</h2>
          {hint === undefined ? null : <p className="text-small text-muted-foreground">{hint}</p>}
        </div>
        {action}
      </div>
      <div
        className={cn("w-full", chartClassName ?? "h-64 small:h-52")}
        role={label === undefined ? undefined : "img"}
        aria-label={label}
      >
        {children}
      </div>
    </section>
  );
}

/** What a chart shows when the period has no data for it. */
export function ChartEmpty({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full items-center justify-center rounded-lg border border-border px-4 text-center text-small text-muted-foreground">
      {children}
    </div>
  );
}
