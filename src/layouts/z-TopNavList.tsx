import { Show } from "~/components/Show";
import { TopNavLink } from "./z-TopNavLink";

type Props = {
  useUser: () => { role: string };
  useShowShortcut: () => boolean;
  hideShortcut: () => void;
};

export function TopNavList({ useUser, useShowShortcut, hideShortcut }: Props) {
  const role = useUser().role;
  return (
    <div className="hidden md:flex items-end gap-1 h-full pt-2">
      <TopNavLink path="/shop" label="Toko" alt="alt+0" root useShowShortcut={useShowShortcut} hideShortcut={hideShortcut} />
      <TopNavLink path="/stock" label="Stok" alt="alt+1" useShowShortcut={useShowShortcut} hideShortcut={hideShortcut} />
      <TopNavLink path="/records" label="Riwayat" alt="alt+2" useShowShortcut={useShowShortcut} hideShortcut={hideShortcut} />
      <Show when={role === "admin"}>
        <TopNavLink path="/money" label="Uang" alt="alt+3" useShowShortcut={useShowShortcut} hideShortcut={hideShortcut} />
      </Show>
    </div>
  );
}
