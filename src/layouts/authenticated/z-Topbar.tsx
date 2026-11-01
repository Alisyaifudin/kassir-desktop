import { useBack, useLocation } from "~/services/route/react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { Refresh } from "./z-Refresh";
import { SettingLink } from "./z-SettingLink";
import { Title } from "./z-Title";
import { TopNavList } from "./z-TopNavList";
import { BackBtn } from "~/components/BackBtn";

const routeTitles: Record<string, string> = {
  "/": "Beranda",
  "/pos": "Toko",
  "/restock": "Stok",
  "/transaction": "Transaksi",
  "/method": "Metode",
  "/customer": "Pelanggan",
  "/cashier": "Kasir",
  "/social": "Kontak",
  "/products": "Produk",
  "/debt": "Utang",
  "/extras": "Biaya Lainnya",
  "/records": "Riwayat",
  "/analytics": "Analisis",
  "/money": "Uang",
  "/setting": "Pengaturan",
};

export function Topbar() {
  const { pathname } = useLocation();
  // The screen this one was entered from, from the app's own history. `/` is the
  // fallback for a screen with nothing behind it — a deep link, or a webview that
  // was relaunched here — which is why no `url_back` is consulted: a link can claim
  // a way back the operator never took, and Beranda is where the app begins.
  const back = useBack("/");

  // Find the title based on the start of the pathname
  const activeRoute = Object.keys(routeTitles)
    .sort((a, b) => b.length - a.length)
    .find((route) => pathname.startsWith(route));

  const title = activeRoute ? routeTitles[activeRoute] : "Aplikasi Kasir";
  const isHome = pathname === "/";

  return (
    <header className="sticky top-0 z-50 w-full bg-sky-300 h-12">
      <nav className="flex items-center justify-between h-full px-4 border-b border-black/10">
        <div className="flex items-center gap-3 h-full">
          {!isHome && (
            <Button
              asChild
              variant="ghost"
              size="icon"
              aria-label="Kembali"
              title="Kembali"
              onClick={back}
              className="rounded-full hover:bg-sky-400/50 h-10 w-10"
            >
              <BackBtn>
              </BackBtn>
            </Button>
          )}
          <h1 className={cn("font-bold tracking-tight transition-all", "text-xl")}>
            {isHome ? "Beranda" : title}
          </h1>
          <Title />
        </div>

        <div className="flex items-center gap-4 h-full">
          <TopNavList />
          <div className="flex items-center gap-2 pl-4 border-l border-black/10 h-10 my-auto">
            <SettingLink />
            <Refresh />
          </div>
        </div>
      </nav>
    </header>
  );
}
