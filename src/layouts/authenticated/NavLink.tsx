import { useLocation, useNavigate } from "react-router";
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
    setShow,
  }: {
    path: string;
    children: string;
    root?: boolean;
    alt: string;
    show: boolean;
    setShow: (s: boolean) => void;
  }) => {
    const { pathname } = useLocation();
    const size = useSize();
    const navigate = useNavigate();
    return (
      <li
        className={cn(
          "rounded-t-lg px-3 font-bold text-normal relative",
          css.navlink[size],
          (root ? pathname === path : pathname.includes(path)) ? "bg-white" : "bg-white/50"
        )}
      >
        <Kbd className={cn("absolute -bottom-3 -left-2", { hidden: !show })}>{alt}</Kbd>
        <button
          className="cursor-pointer"
          onClick={(e) => {
            e.preventDefault();
            setShow(false);
            navigate(path);
          }}
        >
          {children}
        </button>
      </li>
    );
  }
);
