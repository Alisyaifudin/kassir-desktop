import { useLocation, useNavigate } from "react-router";
import { cn } from "~/lib/utils";
import { memo } from "react";
import { Kbd } from "~/components/ui/kdb";
import { showShortcut, useShortcut } from "./use-shortcut";

export const NavLink = memo(
  ({
    path,
    children,
    root = false,
    alt,
  }: {
    path: string;
    children: string;
    root?: boolean;
    alt: string;
  }) => {
    const { pathname } = useLocation();
    const show = useShortcut();
    const navigate = useNavigate();
    return (
      <li
        className={cn(
          "rounded-t-lg px-3 font-bold items-center flex text-normal relative",
          "px-3 small:px-2 h-[60px] small:h-[35px]",
          (root ? pathname === path : pathname.includes(path)) ? "bg-white" : "bg-white/50",
        )}
      >
        <Kbd className={cn("absolute -bottom-3 -left-2", { hidden: !show })}>{alt}</Kbd>
        <button
          className="cursor-pointer"
          onClick={(e) => {
            e.preventDefault();
            showShortcut(false);
            navigate(path);
          }}
        >
          {children}
        </button>
      </li>
    );
  },
);
