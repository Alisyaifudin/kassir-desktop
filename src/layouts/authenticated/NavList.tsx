import { cn } from "~/lib/utils";
import { NavLink } from "./NavLink";
import { Show } from "~/components/Show";
import { SettingLink } from "./SettingLink";
import { Refresh } from "../../components/Refresh";
import { css } from "./style.css";
import { useSize } from "~/hooks/use-size";
import { auth } from "~/lib/auth";
import { memo } from "react";

export const NavList = memo(() => {
  const size = useSize();
  const role = auth.user().role;
  return (
    <ul className={cn("flex justify-end items-end", css.navlist[size])}>
      <NavLink path="/" root>
        Toko
      </NavLink>
      <NavLink path="/stock">Stok</NavLink>
      <NavLink path="/records">Riwayat</NavLink>
      <Show when={role === "admin"}>
        <NavLink path="/analytics">Analisis</NavLink>
        <NavLink path="/money">Uang</NavLink>
      </Show>
      <SettingLink />
      <Refresh />
    </ul>
  );
});
