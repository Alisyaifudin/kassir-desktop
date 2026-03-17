import {
  Store,
  Package,
  History,
  BarChart3,
  Wallet,
  Settings,
  Phone,
  Users,
  CreditCard,
  ReceiptText,
} from "lucide-react";
import { NavCard } from "./z-NavCard";
import { useUser } from "~/hooks/use-user";
import { Show } from "~/components/Show";

export function NavGrid() {
  const user = useUser();
  const isAdmin = user.role === "admin";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <NavCard
        label="Toko"
        path="/shop"
        icon={Store}
        description="Buka toko dan lakukan transaksi penjualan"
        color="bg-blue-100 text-blue-600"
      />
      <NavCard
        label="Stok"
        path="/stock"
        icon={Package}
        description="Kelola stok produk dan inventaris barang"
        color="bg-orange-100 text-orange-600"
      />
      <NavCard
        label="Riwayat"
        path="/records"
        icon={History}
        description="Lihat riwayat transaksi dan catatan penjualan"
        color="bg-purple-100 text-purple-600"
      />
      <NavCard
        label="Analisis"
        path="/analytics"
        icon={BarChart3}
        description="Pantau perkembangan bisnis dengan grafik"
        color="bg-green-100 text-green-600"
      />
      <Show when={isAdmin}>
        <NavCard
          label="Uang"
          path="/money"
          icon={Wallet}
          description="Kelola keuangan dan kasir toko"
          color="bg-emerald-100 text-emerald-600"
        />
      </Show>
      <NavCard
        label="Kontak"
        path="/social"
        icon={Phone}
        description="Kelola informasi media sosial dan kontak lainnya"
        color="bg-purple-100 text-purple-600"
      />
      <NavCard
        label="Kasir"
        path="/cashier"
        icon={Users}
        description="Kelola akun kasir dan peran"
        color="bg-emerald-100 text-emerald-700"
      />
      <NavCard
        label="Metode"
        path="/method"
        icon={CreditCard}
        description="Konfigurasi metode pembayaran"
        color="bg-indigo-100 text-indigo-700"
      />
      <NavCard
        label="Pelanggan"
        path="/customer"
        icon={ReceiptText}
        description="Kelola daftar pelanggan"
        color="bg-teal-100 text-teal-700"
      />
      <NavCard
        label="Pengaturan"
        path="/setting"
        icon={Settings}
        description="Konfigurasi akun dan pengaturan aplikasi"
        color="bg-gray-100 text-gray-600"
      />
    </div>
  );
}
