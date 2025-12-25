import { Link, useLocation } from "react-router";
import { cn } from "~/lib/utils";
import { css } from "./style.css";
import { useSize } from "~/hooks/use-size";
import { memo } from "react";
import { Kbd } from "~/components/ui/kdb";

export const NavLink = memo(
  ({
    path,
    children,
    root = false,
    alt,
    show,
  }: {
    path: string;
    children: string;
    root?: boolean;
    alt: string;
    show: boolean;
  }) => {
    const { pathname } = useLocation();
    const size = useSize();
    return (
      <li
        className={cn(
          "rounded-t-lg px-3 font-bold text-normal relative",
          css.navlink[size],
          (root ? pathname === path : pathname.includes(path)) ? "bg-white" : "bg-white/50"
        )}
      >
        <Kbd className={cn("absolute -bottom-3 -left-2", { hidden: !show })}>{alt}</Kbd>
        <Link to={path}>{children}</Link>
      </li>
    );
  }
);
