import { useLocation, useNavigate } from "react-router";
import { cn } from "~/lib/utils";
import { useUser } from "~/hooks/use-user";
import { Show } from "~/components/Show";
import { Kbd } from "~/components/ui/kdb";
import { useShortcut, showShortcut } from "./use-shortcut";

interface TopNavLinkProps {
  path: string;
  label: string;
  alt: string;
  root?: boolean;
}

function TopNavLink({ path, label, alt, root = false }: TopNavLinkProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const show = useShortcut();
  const isActive = root ? pathname.startsWith(path) : pathname.includes(path);

  return (
    <div className="relative flex items-end h-full">
      <Kbd className={cn("absolute -top-1 -left-1 z-30", { hidden: !show })}>{alt}</Kbd>
      <button
        onClick={() => {
          const search = new URLSearchParams();
          search.set("url_back", "/");
          navigate(`${path}?${search.toString()}`);
          showShortcut(false);
        }}
        className={cn(
          "px-4 h-[56px] small:h-[44px] font-bold transition-all flex items-center justify-center text-3xl small:text-2xl",
          "rounded-t-2xl border-x border-t border-transparent relative",
          isActive
            ? "bg-white text-primary border-black/10 -mb-[1px] z-10"
            : "text-primary/70 hover:bg-sky-400/30 hover:text-primary",
        )}
      >
        {label}
      </button>
    </div>
  );
}

export function TopNavList() {
  const role = useUser().role;

  return (
    <div className="hidden md:flex items-end gap-1 h-full pt-2">
      <TopNavLink path="/shop" label="Toko" alt="alt+0" root />
      <TopNavLink path="/stock" label="Stok" alt="alt+1" />
      <TopNavLink path="/records" label="Riwayat" alt="alt+2" />
      <TopNavLink path="/analytics" label="Analisis" alt="alt+3" />
      <Show when={role === "admin"}>
        <TopNavLink path="/money" label="Uang" alt="alt+4" />
      </Show>
    </div>
  );
}
