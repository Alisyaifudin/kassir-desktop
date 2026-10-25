import { Building2, Database, Printer, ScrollText, User, type LucideIcon } from "lucide-react";
import type { Role } from "~/services/cashier";

export type Section = "Akun" | "Toko" | "Sistem";

export type NavItem = {
  label: string;
  path: string;
  /** One plain sentence on what the screen holds, short enough to sit under the label. */
  description: string;
  icon: LucideIcon;
  /**
   * Accent hue in oklch degrees: the colour of the glyph only. The row, the panel
   * and the canvas stay neutral, so a hue names a destination without tinting a
   * surface (the lightness/chroma live in `.tone`, global.css).
   */
  hue: number;
  section: Section;
  /** Roles allowed to open the page — each route enforces this with `AdminOnly` (or not, as noted). */
  roles: Role[];
};

/**
 * The single source of truth for `/setting/*` destinations, read by both the
 * index row list (`z-NavRow`) and the desktop sidebar (`z-NavPanel`).
 *
 * Sections follow the order they appear here.
 */
export const settingsNav: NavItem[] = [
  {
    label: "Profil",
    path: "/setting/profile",
    description: "Nama dan kata sandi akun",
    icon: User,
    hue: 255,
    section: "Akun",
    roles: ["admin", "user"],
  },
  {
    label: "Toko",
    path: "/setting/shop",
    description: "Identitas toko dan opsi kasir",
    icon: Building2,
    hue: 150,
    section: "Toko",
    roles: ["admin"],
  },
  {
    label: "Data",
    path: "/setting/data",
    description: "Unduh dan unggah data aplikasi",
    icon: Database,
    hue: 55,
    section: "Sistem",
    roles: ["admin"],
  },
  {
    label: "Printer",
    path: "/setting/printer",
    description: "Printer dan lebar kertas untuk cetak struk",
    icon: Printer,
    hue: 200,
    section: "Sistem",
    roles: ["admin"],
  },
  {
    label: "Log",
    path: "/setting/log",
    description: "Aktivitas dan kesalahan aplikasi",
    icon: ScrollText,
    hue: 300,
    section: "Sistem",
    roles: ["admin"],
  },
];

/** Flat list of the destinations `role` may open, in sidebar order. */
export function navOf(role: Role) {
  return settingsNav.filter((item) => item.roles.includes(role));
}

/**
 * The destination a settings screen belongs to. The screen's head quotes the hub
 * verbatim from here, so the row you clicked and the page you landed on can never
 * start describing themselves differently.
 */
export function navItemOf(path: string): NavItem {
  const item = settingsNav.find((it) => it.path === path);
  if (item === undefined) throw new Error(`Unknown settings path: ${path}`);
  return item;
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
