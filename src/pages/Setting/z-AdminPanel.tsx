import { Building2, User, Database, ScrollText, Printer } from "lucide-react";
import { NavLink } from "./z-NavLink";

export function AdminPanel() {
  const items = [
    { path: "/setting/shop", label: "Toko", icon: Building2 },
    { path: "/setting/profile", label: "Profil", icon: User },
    { path: "/setting/data", label: "Data", icon: Database },
    { path: "/setting/printer", label: "Printer", icon: Printer },
    { path: "/setting/log", label: "Log", icon: ScrollText },
  ] as const;
  return (
    <ol className="flex flex-col gap-1 rounded-2xl border bg-card p-2 shadow-sm">
      {items.map((item) => (
        <NavLink key={item.path} path={item.path} icon={item.icon}>
          {item.label}
        </NavLink>
      ))}
    </ol>
  );
}
