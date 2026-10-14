import { BarChart3, TrendingDown, TrendingUp } from "lucide-react";
import type { Stats } from "./use-stats";

export function TotalTransactionsCard({ stats }: { stats: Stats }) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-6 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="font-medium text-muted-foreground">Total Transaksi</span>
        <div className="rounded-lg bg-blue-500/10 p-2">
          <BarChart3 className="size-5 text-blue-500 small:size-4" />
        </div>
      </div>

      <div className="mt-auto grid grid-cols-2 gap-4 border-t pt-2">
        <Total label="Penjualan" value={stats.today.incoming.count} tone="text-green-600">
          <TrendingUp className="size-3.5 small:size-3" />
        </Total>
        <Total label="Pembelian" value={stats.today.outcoming.count} tone="text-amber-600">
          <TrendingDown className="size-3.5 small:size-3" />
        </Total>
      </div>
    </div>
  );
}

function Total({
  label,
  value,
  tone,
  children,
}: {
  label: string;
  value: number;
  tone: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className={`flex items-center gap-1.5 ${tone}`}>
        {children}
        <span className="text-small font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <span className="font-bold">{value}</span>
    </div>
  );
}
