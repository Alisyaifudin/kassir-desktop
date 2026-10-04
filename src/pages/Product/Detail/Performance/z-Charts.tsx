import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Bin, ListingAggregate } from "./use-performance";

const COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed", "#0891b2", "#db2777"];

function formatNumber(value: number): string {
  return Number(value).toLocaleString("id-ID");
}

function ChartFrame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-card p-3">
      <h3 className="text-normal font-medium">{title}</h3>
      <div className="h-56 w-full">{children}</div>
    </div>
  );
}

export function QtyChart({ data }: { data: Bin[] }) {
  return (
    <ChartFrame title="Penjualan (qty)">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} width={44} />
          <Tooltip formatter={(value) => formatNumber(Number(value))} />
          <Bar dataKey="qty" fill="#2563eb" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function RevenueChart({ data }: { data: Bin[] }) {
  return (
    <ChartFrame title="Omzet">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} width={56} tickFormatter={formatNumber} />
          <Tooltip formatter={(value) => formatNumber(Number(value))} />
          <Bar dataKey="revenue" fill="#16a34a" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function ProfitChart({ data }: { data: Bin[] }) {
  return (
    <ChartFrame title="Laba">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} width={56} tickFormatter={formatNumber} />
          <Tooltip formatter={(value) => formatNumber(Number(value))} />
          <Line type="monotone" dataKey="profit" stroke="#7c3aed" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function StockChart({ data }: { data: { label: string; value: number }[] }) {
  return (
    <ChartFrame title="Stok">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} width={44} />
          <Tooltip formatter={(value) => formatNumber(Number(value))} />
          <Line type="monotone" dataKey="value" stroke="#0891b2" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function ListingChart({ data }: { data: ListingAggregate[] }) {
  return (
    <ChartFrame title="Omzet per listing">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="revenue" nameKey="name" outerRadius={80} label>
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => formatNumber(Number(value))} />
        </PieChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
