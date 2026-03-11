import { cn } from "~/lib/utils";
import { NavLink } from "./z-NavLink";
import { Show } from "~/components/Show";
import { SettingLink } from "./z-SettingLink";
import { Refresh } from "./z-Refresh";
import { memo, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { showShortcut } from "./use-shortcut";
import { Button } from "~/components/ui/button";
import { Home } from "lucide-react";
import { useUser } from "~/hooks/use-user";

const linkMap = {
  0: "/",
  1: "/stock",
  2: "/records",
  3: "/analytics",
  4: "/money",
  5: "/setting",
} as Record<string, string>;

let press = false;

export const NavList = memo(() => {
  const role = useUser().role;
  const navigate = useNavigate();
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (!e.altKey) return;
      const link = linkMap[e.key] as string | undefined;
      if (link === undefined) return;
      showShortcut(false);
      navigate(link);
    }
    function handleAltDown(e: KeyboardEvent) {
      if (e.altKey) {
        e.preventDefault();
        if (press) return;
        showShortcut((prev) => !prev);
        press = true;
      }
    }
    function handleAltUp(e: KeyboardEvent) {
      if (!e.altKey) {
        e.preventDefault();
        press = false;
      }
    }
    document.body.addEventListener("keydown", handleKey);
    document.body.addEventListener("keydown", handleAltDown);
    document.body.addEventListener("keyup", handleAltUp);
    return () => {
      document.body.removeEventListener("keydown", handleKey);
      document.body.removeEventListener("keydown", handleAltDown);
      document.body.removeEventListener("keyup", handleAltUp);
    };
  }, []);
  return (
    <ul className={cn("flex justify-end items-end pt-2 small:pt-1 gap-5 small:gap-[10px]")}>
      <Button asChild variant="link" size="icon">
        <Link to="/">
          <Home />
        </Link>
      </Button>
      <NavLink path="/" root alt="alt+0">
        Toko
      </NavLink>
      <NavLink path="/stock" alt="alt+1">
        Stok
      </NavLink>
      <NavLink path="/records" alt="alt+2">
        Riwayat
      </NavLink>
      <NavLink path="/analytics" alt="alt+3">
        Analisis
      </NavLink>
      <Show when={role === "admin"}>
        <NavLink path="/money" alt="alt+4">
          Uang
        </NavLink>
      </Show>
      <SettingLink />
      <Refresh />
    </ul>
  );
});
