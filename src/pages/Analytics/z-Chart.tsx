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

const METHOD_COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed"] as const;

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

/** Counts in the tooltip, for the two histogram charts. */
export function countTooltip(value: unknown): string {
  return `${Number(value).toLocaleString("id-ID")} transaksi`;
}

/**
 * Everything recharts is handed, as constants.
 *
 * These cannot be object literals in the JSX. Recharts keeps each chart's state
 * in a store and dispatches into it from effects, comparing the props it is
 * given: `contentStyle={{…}}`, `margin={{…}}`, `radius={[…]}` and inline
 * `formatter`/`shape`/`tick` functions are a new identity on every render, so
 * each render looked like a change, dispatched another update, and the next
 * render produced another fresh object — a feedback loop that never settles.
 * It is what froze `/analytics`: `Maximum update depth exceeded` on repeat in
 * the console, the page's DOM stuck at its last commit, and eventually the
 * WebKit renderer wedged while every script call timed out.
 *
 * So: a prop reaching recharts is either a constant here, or built in a
 * `useMemo`. Never an inline literal, never an inline function.
 *
 * The tooltip's style lands in an inline style, so `var()` is safe there.
 */
export const TOOLTIP_STYLE = {
  contentStyle: {
    background: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    color: "var(--popover-foreground)",
  },
  labelStyle: {
    color: "var(--muted-foreground)",
  },
} as const;

/** Rupiah in the tooltip, for the pages whose every series is money. */
export function moneyTooltip(value: unknown): string {
  return money(Number(value));
}

/** Plot margins: the default, and the ranked chart's wider label gutter. */
export const CHART_MARGIN = { top: 8, right: 8, left: 0, bottom: 0 } as const;
export const RANK_MARGIN = { top: 8, right: 20, left: 4, bottom: 8 } as const;

/** Corner radii. Arrays compare by identity, so they live out here too. */
export const RADIUS_TOP: [number, number, number, number] = [3, 3, 0, 0];
export const RADIUS_BOTTOM: [number, number, number, number] = [0, 0, 3, 3];
export const RADIUS_START: [number, number, number, number] = [0, 3, 3, 0];

/** Axis geometry. SVG attributes cannot read CSS variables, so these stay concrete. */
export const chartGeometry = {
  tick: { fontSize: 14 },
  yWidth: 56,
} as const;

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
          <h2 className="text-sm font-semibold">{title}</h2>
          {hint === undefined ? null : <p className="text-sm text-muted-foreground">{hint}</p>}
        </div>
        {action}
      </div>
      <div
        className={cn("w-full", chartClassName ?? "h-64")}
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
    <div className="flex h-full items-center justify-center rounded-lg border border-border px-4 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}
