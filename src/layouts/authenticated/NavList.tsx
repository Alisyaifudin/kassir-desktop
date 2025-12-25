import { cn } from "~/lib/utils";
import { NavLink } from "./NavLink";
import { Show } from "~/components/Show";
import { SettingLink } from "./SettingLink";
import { Refresh } from "../../components/Refresh";
import { css } from "./style.css";
import { useSize } from "~/hooks/use-size";
import { auth } from "~/lib/auth";
import { memo, useEffect, useState } from "react";
import { useNavigate } from "react-router";

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
  const size = useSize();
  const role = auth.user().role;
  const [show, setShow] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (!e.altKey) return;
      const link = linkMap[e.key] as string | undefined;
      if (link === undefined) return;
      navigate(link);
      setShow(false);
    }
    function handleAltDown(e: KeyboardEvent) {
      if (e.altKey) {
        e.preventDefault();
        if (press) return;
        setShow((prev) => !prev);
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
    <ul className={cn("flex justify-end items-end", css.navlist[size])}>
      <NavLink path="/" root show={show} alt="alt+0">
        Toko
      </NavLink>
      <NavLink path="/stock" show={show} alt="alt+1">
        Stok
      </NavLink>
      <NavLink path="/records" show={show} alt="alt+2">
        Riwayat
      </NavLink>
      <NavLink path="/analytics" show={show} alt="alt+3">
        Analisis
      </NavLink>
      <Show when={role === "admin"}>
        <NavLink path="/money" show={show} alt="alt+4">
          Uang
        </NavLink>
      </Show>
      <SettingLink show={show} />
      <Refresh />
    </ul>
  );
});
