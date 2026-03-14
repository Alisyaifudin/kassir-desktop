import { BarChart3, Package, Wallet } from "lucide-react";
import { StatsCard } from "./z-StatsCard";

export function StatsGrid() {
  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mb-8">
      <StatsCard
        label="Pendapatan Hari Ini"
        value="Rp 1.250.000"
        description="+12% dari kemarin"
        icon={Wallet}
        color="text-green-500"
      />
      <StatsCard
        label="Total Transaksi"
        value="42"
        description="+5 dari kemarin"
        icon={BarChart3}
        color="text-blue-500"
      />
      <StatsCard
        label="Stok Hampir Habis"
        value="5 Item"
        description="Segera perbarui stok"
        icon={Package}
        color="text-red-500"
      />
    </div>
  );
}
