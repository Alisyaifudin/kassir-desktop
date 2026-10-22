import {
  BadgePercent,
  FilePlus2,
  BarChart3,
  CreditCard,
  HandCoins,
  History,
  Package,
  PackagePlus,
  Phone,
  ReceiptText,
  Settings,
  ShoppingCart,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router";
import { useUser } from "~/hooks/use-user";
import { cn } from "~/lib/utils";
import { withUrlBack } from "./format";

type Destination = {
  label: string;
  path: string;
  icon: LucideIcon;
  /** One plain sentence on what the screen is for, short enough for a tile. */
  description: string;
  /** The app-wide shortcut that already reaches this screen, when there is one. */
  alt?: string;
  admin?: boolean;
};

/**
 * Every screen, in the order the shop uses them: the sale first, the day's
 * record-keeping next, the catalogs after it, the admin-only setup last.
 *
 * Tiles, not a list of rows: each one is a real target with the app's own icon,
 * the name, one plain sentence on what the screen is for, and the key that
 * already goes there. They sit straight on the canvas — a card of cards reads as
 * nesting, and the tile is already the container.
 */
const DESTINATIONS: Destination[] = [
  {
    label: "Toko",
    path: "/pos",
    icon: ShoppingCart,
    alt: "alt+0",
    description: "Jual ke pelanggan",
  },
  {
    label: "Stok",
    path: "/restock",
    icon: PackagePlus,
    alt: "alt+1",
    description: "Catat pembelian",
  },
  {
    label: "Transaksi",
    path: "/transaction",
    icon: FilePlus2,
    description: "Catat transaksi manual",
  },
  {
    label: "Produk",
    path: "/products",
    icon: Package,
    alt: "alt+2",
    description: "Katalog dan stok",
  },
  {
    label: "Riwayat",
    path: "/records",
    icon: History,
    alt: "alt+3",
    description: "Transaksi tercatat",
  },
  {
    label: "Uang",
    path: "/money",
    icon: Wallet,
    alt: "alt+4",
    admin: true,
    description: "Kantong dan kas",
  },
  { label: "Analisis", path: "/analytics", icon: BarChart3, description: "Grafik penjualan" },
  { label: "Utang", path: "/debt", icon: HandCoins, description: "Utang pelanggan" },
  {
    label: "Biaya Lainnya",
    path: "/extras",
    icon: BadgePercent,
    description: "Biaya dan potongan",
  },
  {
    label: "Pelanggan",
    path: "/customer",
    icon: ReceiptText,
    admin: true,
    description: "Daftar pelanggan",
  },
  { label: "Kasir", path: "/cashier", icon: Users, admin: true, description: "Akun dan peran" },
  {
    label: "Metode",
    path: "/method",
    icon: CreditCard,
    admin: true,
    description: "Metode pembayaran",
  },
  { label: "Kontak", path: "/social", icon: Phone, admin: true, description: "Kontak toko" },
  {
    label: "Pengaturan",
    path: "/setting",
    icon: Settings,
    alt: "alt+5",
    description: "Akun dan tampilan",
  },
];

export function Menu() {
  const role = useUser().role;
  const items = DESTINATIONS.filter((item) => item.admin !== true || role === "admin");

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-normal font-semibold">Menu</h2>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {items.map((item) => {
          const meta = item.alt ?? (item.admin === true ? "admin" : null);
          return (
            <li key={item.path}>
              <Link
                to={withUrlBack(item.path)}
                className="group flex h-full flex-col gap-3 rounded-xl border bg-card p-2.5 transition-colors sm:p-4 hover:border-active/50 hover:bg-active/5 focus-visible:ring-2 focus-visible:ring-active focus-visible:outline-none"
              >
                <span className="flex w-full items-start justify-between gap-2">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-active/10 group-hover:text-active">
                    <item.icon aria-hidden="true" className="size-5" />
                  </span>
                  {meta === null ? null : (
                    <span
                      className={cn(
                        "text-small text-muted-foreground",
                        item.alt === undefined ? undefined : "tabular-nums",
                      )}
                    >
                      {meta}
                    </span>
                  )}
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="text-small font-medium">{item.label}</span>
                  <span className="text-small text-muted-foreground">{item.description}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
