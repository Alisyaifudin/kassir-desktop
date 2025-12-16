import { Link, useLocation } from "react-router";
import { cn } from "~/lib/utils";
import { css } from "./style.css";
import { useSize } from "~/hooks/use-size";
import { memo } from "react";

export const NavLink = memo(
  ({ path, children, root = false }: { path: string; children: string; root?: boolean }) => {
    const { pathname } = useLocation();
    const size = useSize();
    return (
      <li
        className={cn(
          "rounded-t-lg px-3 font-bold text-normal",
          css.navlink[size],
          (root ? pathname === path : pathname.includes(path)) ? "bg-white" : "bg-white/50"
        )}
      >
        <Link to={path}>{children}</Link>
      </li>
    );
  }
);
