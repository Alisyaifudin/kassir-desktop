import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "~/lib/utils";
import type { Bin, ListingAggregate } from "./use-performance";

/**
 * Concrete colors, not `var(--chart-n)`: `fill`/`stroke` on SVG are presentation
 * attributes, and `var()` inside them is not reliably supported. The app never
 * applies the `.dark` class (nothing toggles it), so a single light palette is
 * correct today — if dark mode is ever wired up, read `--chart-n` in JS via
 * `getComputedStyle` instead of putting the var in the attribute.
 */
const COLORS = [
  "#2563eb",
  "#16a34a",
  "#f59e0b",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
  "#db2777",
];

function palette(index: number): string {
  return COLORS[index % COLORS.length] ?? COLORS[0]!;
}

function formatNumber(value: number): string {
  return Number(value).toLocaleString("id-ID");
}

/** Tick / axis geometry. SVG attributes cannot read CSS variables, so these stay concrete. */
const chartGeometry = {
  tick: { fontSize: 14 },
  yWidth: 56,
} as const;

/** Tooltip lands in an inline `style`, so `var()` is safe there. */
const TOOLTIP = {
  contentStyle: {
    background: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    color: "var(--popover-foreground)",
  },
  labelStyle: { color: "var(--muted-foreground)" },
};

function ChartFrame({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-2 rounded-xl border bg-card p-3", className)}>
      <h3 className="text-sm font-medium">{title}</h3>
      <div className="h-56 w-full">{children}</div>
    </div>
  );
}

export function QtyChart({ data }: { data: Bin[] }) {
  const geo = chartGeometry;
  return (
    <ChartFrame title="Penjualan (qty)">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={geo.tick} />
          <YAxis tick={geo.tick} width={geo.yWidth} />
          <Tooltip formatter={(value) => formatNumber(Number(value))} {...TOOLTIP} />
          <Bar dataKey="qty" fill="#2563eb" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function RevenueChart({ data }: { data: Bin[] }) {
  const geo = chartGeometry;
  return (
    <ChartFrame title="Omzet">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={geo.tick} />
          <YAxis tick={geo.tick} width={geo.yWidth} tickFormatter={formatNumber} />
          <Tooltip formatter={(value) => formatNumber(Number(value))} {...TOOLTIP} />
          <Bar dataKey="revenue" fill="#16a34a" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function ProfitChart({ data }: { data: Bin[] }) {
  const geo = chartGeometry;
  return (
    <ChartFrame title="Laba">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={geo.tick} />
          <YAxis tick={geo.tick} width={geo.yWidth} tickFormatter={formatNumber} />
          <Tooltip formatter={(value) => formatNumber(Number(value))} {...TOOLTIP} />
          <Line type="monotone" dataKey="profit" stroke="#7c3aed" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function StockChart({ data }: { data: { label: string; value: number }[] }) {
  const geo = chartGeometry;
  return (
    <ChartFrame title="Stok">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={geo.tick} />
          <YAxis tick={geo.tick} width={geo.yWidth} />
          <Tooltip formatter={(value) => formatNumber(Number(value))} {...TOOLTIP} />
          <Line type="monotone" dataKey="value" stroke="#0891b2" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function ListingChart({ data }: { data: ListingAggregate[] }) {
  const geo = chartGeometry;
  return (
    <ChartFrame title="Omzet per listing" className="lg:col-span-2">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="revenue" nameKey="name" outerRadius="80%">
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={palette(index)} />
            ))}
          </Pie>
          <Legend wrapperStyle={{ fontSize: geo.tick.fontSize }} />
          <Tooltip formatter={(value) => formatNumber(Number(value))} {...TOOLTIP} />
        </PieChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
