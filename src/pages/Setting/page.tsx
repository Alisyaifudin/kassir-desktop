import {
  Building2,
  User,
  Database,
  Printer,
  ScrollText,
  LogOut,
} from "lucide-react";
import { Link, useLocation } from "react-router";
import { useUser } from "~/hooks/use-user";
import { cn, capitalize } from "~/lib/utils";
import { useLogout } from "./use-logout";

type Card = {
  label: string;
  path: string;
  description: string;
  icon: typeof Building2;
  color: string;
};

const adminCards: Card[] = [
  {
    label: "Toko",
    path: "/setting/shop",
    description: "Identitas toko, ukuran tampilan, dan opsi kasir",
    icon: Building2,
    color: "bg-blue-100 text-blue-600",
  },
  {
    label: "Profil",
    path: "/setting/profile",
    description: "Ubah nama dan kata sandi akun",
    icon: User,
    color: "bg-gray-100 text-gray-600",
  },
  {
    label: "Data",
    path: "/setting/data",
    description: "Kelola dan lihat data aplikasi",
    icon: Database,
    color: "bg-amber-100 text-amber-700",
  },
  {
    label: "Printer",
    path: "/setting/printer",
    description: "Pengaturan printer struk",
    icon: Printer,
    color: "bg-slate-100 text-slate-700",
  },
  {
    label: "Log",
    path: "/setting/log",
    description: "Lihat log aplikasi",
    icon: ScrollText,
    color: "bg-red-100 text-red-700",
  },
];

const userCards: Card[] = [
  {
    label: "Profil",
    path: "/setting/profile",
    description: "Ubah nama dan kata sandi akun",
    icon: User,
    color: "bg-gray-100 text-gray-600",
  },
];

export default function Page() {
  const user = useUser();
  const handleLogout = useLogout();
  const cards = user.role === "admin" ? adminCards : userCards;

  return (
    <div className="flex flex-col gap-6 py-2">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-big font-bold tracking-tight">Pengaturan</h1>
          <p className="text-muted-foreground">
            Masuk sebagai {capitalize(user.name)} ({user.role})
          </p>
        </div>
        <button
          onClick={handleLogout}
          className={cn(
            "group flex items-center gap-3 rounded-2xl border bg-card px-4 py-3 transition-all hover:bg-accent hover:shadow-md",
            "text-destructive hover:text-destructive",
          )}
          type="button"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
            <LogOut size={20} />
          </div>
          <div className="flex flex-col items-start leading-tight">
            <span className="font-bold">Keluar</span>
          </div>
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 grid-cols-1">
        <Cards cards={cards} />
      </div>
    </div>
  );
}

function Cards({ cards }: { cards: Card[] }) {
  return (
    <>
      {cards.map((card) => (
        <NavCard key={card.path} card={card} />
      ))}
    </>
  );
}

function NavCard({ card }: { card: Card }) {
  const { pathname } = useLocation();
  const search = new URLSearchParams();
  search.set("url_back", pathname);
  const to = `${card.path}?${search.toString()}`;
  const Icon = card.icon;
  return (
    <Link
      to={to}
      className={cn(
        "group flex items-center gap-4 rounded-2xl border bg-card p-5 transition-all hover:bg-accent hover:shadow-md",
      )}
    >
      <div
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-2xl transition-transform group-hover:scale-110",
          card.color,
        )}
      >
        <Icon size={28} />
      </div>
      <div className="flex flex-col gap-0.5">
        <h3 className="text-big font-bold tracking-tight">{card.label}</h3>
        <p className="text-muted-foreground">{card.description}</p>
      </div>
    </Link>
  );
}
