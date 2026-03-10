import { Settings } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import { cn } from "~/lib/utils";
import { auth } from "~/lib/auth";
import { Kbd } from "~/components/ui/kdb";
import { showShortcut, useShortcut } from "./use-shortcut";
import { useSize } from "~/hooks/use-size";

const iconSize = {
  big: 40,
  small: 20,
};

export function SettingLink() {
  const { pathname } = useLocation();
  const role = auth.get()?.role;
  const size = useSize();
  const show = useShortcut();
  const navigate = useNavigate();
  return (
    <li
      className={cn(
        "rounded-t-full flex items-center px-3 relative",
        "h-[60px] small:h-[35px]",
        pathname.includes("/setting") ? "bg-white" : "bg-black text-white",
      )}
    >
      <Kbd className={cn("absolute -bottom-3 -left-2", { hidden: !show })}>alt+5</Kbd>
      <button
        onClick={(e) => {
          e.preventDefault();
          const p = role === "admin" ? "/setting/shop" : "/setting/profile";
          navigate(p);
          showShortcut(false);
        }}
        className="relative cursor-pointer"
      >
        <Settings size={iconSize[size]} />
        {/* <Show when={hasUpdate}>
					<BellRing
						size={icon[size]}
						className="text-red-500 animate-ring absolute -top-3 -right-3"
					/>
				</Show> */}
      </button>
    </li>
  );
}
