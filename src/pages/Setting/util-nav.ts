import {
  Building2,
  Database,
  Printer,
  ScrollText,
  User,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "~/services/cashier";

export type Section = "Akun" | "Toko" | "Sistem";

export type NavItem = {
  label: string;
  path: string;
  description: string;
  icon: LucideIcon;
  /** Icon tile colors, used by the card grid on `/setting`. */
  color: string;
  section: Section;
  /** Roles allowed to open the page — each route enforces this with `AdminOnly` (or not, as noted). */
  roles: Role[];
};

/**
 * The single source of truth for `/setting/*` destinations, read by both the
 * index card grid (`z-NavCard`) and the desktop sidebar (`z-NavPanel`).
 *
 * Sections follow the order they appear here.
 */
export const settingsNav: NavItem[] = [
  {
    label: "Profil",
    path: "/setting/profile",
    description: "Ubah nama dan kata sandi akun",
    icon: User,
    color: "bg-gray-100 text-gray-600",
    section: "Akun",
    roles: ["admin", "user"],
  },
  {
    label: "Toko",
    path: "/setting/shop",
    description: "Identitas toko, ukuran tampilan, dan opsi kasir",
    icon: Building2,
    color: "bg-blue-100 text-blue-600",
    section: "Toko",
    roles: ["admin"],
  },
  {
    label: "Data",
    path: "/setting/data",
    description: "Kelola dan lihat data aplikasi",
    icon: Database,
    color: "bg-amber-100 text-amber-700",
    section: "Sistem",
    roles: ["admin"],
  },
  {
    label: "Printer",
    path: "/setting/printer",
    description: "Pengaturan printer struk",
    icon: Printer,
    color: "bg-slate-100 text-slate-700",
    section: "Sistem",
    roles: ["admin"],
  },
  {
    label: "Log",
    path: "/setting/log",
    description: "Lihat log aplikasi",
    icon: ScrollText,
    color: "bg-red-100 text-red-700",
    section: "Sistem",
    roles: ["admin"],
  },
];

/** Flat list of the destinations `role` may open, in sidebar order. */
export function navOf(role: Role) {
  return settingsNav.filter((item) => item.roles.includes(role));
}

/** The destinations `role` may open, grouped by section, empty sections dropped. */
export function navGroupsOf(role: Role) {
  const groups = new Map<Section, NavItem[]>();
  for (const item of navOf(role)) {
    const group = groups.get(item.section);
    if (group) group.push(item);
    else groups.set(item.section, [item]);
  }
  return [...groups].map(([section, items]) => ({ section, items }));
}
