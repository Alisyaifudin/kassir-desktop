import { ArrowLeft } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { Refresh } from "./z-Refresh";
import { SettingLink } from "./z-SettingLink";
import { useGetUrlBack } from "~/hooks/use-get-url-back";
import { TopNavList } from "./z-TopNavList";
import { type ReactNode } from "react";

const routeTitles: Record<string, string> = {
  "/": "Beranda",
  "/shop": "Toko",
  "/method": "Metode",
  "/customer": "Pelanggan",
  "/cashier": "Kasir",
  "/social": "Kontak",
  "/stock": "Stok",
  "/records": "Riwayat",
  "/analytics": "Analisis",
  "/money": "Uang",
  "/setting": "Pengaturan",
};

type Props = {
  useUser: () => { role: string };
  titleElement: ReactNode;
  useShowShortcut: () => boolean;
  hideShortcut: () => void;
};

export function Topbar({ useUser, titleElement, useShowShortcut, hideShortcut }: Props) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const backUrl = useGetUrlBack("/");

  const activeRoute = Object.keys(routeTitles)
    .sort((a, b) => b.length - a.length)
    .find((route) => pathname.startsWith(route));

  const title = activeRoute ? routeTitles[activeRoute] : "Aplikasi Kasir";
  const isHome = pathname === "/";

  return (
    <header className="sticky top-0 z-50 w-full bg-sky-300 h-16 small:h-12">
      <nav className="flex items-center justify-between h-full px-4 small:px-2 border-b border-black/10">
        <div className="flex items-center gap-3 h-full">
          {!isHome && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(backUrl)}
              className="rounded-full hover:bg-sky-400/50 h-10 w-10 small:h-8 small:w-8"
            >
              <ArrowLeft className="h-6 w-6 small:h-5 small:w-5" />
            </Button>
          )}
          <h1
            className={cn("font-bold tracking-tight transition-all", "text-3xl small:text-2xl")}
          >
            {isHome ? "Beranda" : title}
          </h1>
          {titleElement}
        </div>

        <div className="flex items-center gap-4 h-full">
          <TopNavList useUser={useUser} useShowShortcut={useShowShortcut} hideShortcut={hideShortcut} />
          <div className="flex items-center gap-2 small:gap-1 pl-4 border-l border-black/10 h-10 small:h-8 my-auto">
            <SettingLink useShowShortcut={useShowShortcut} hideShortcut={hideShortcut} />
            <Refresh />
          </div>
        </div>
      </nav>
    </header>
  );
}
