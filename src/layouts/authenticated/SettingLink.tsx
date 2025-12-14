import { Settings } from "lucide-react";
import { Link, useLocation } from "react-router";
import { cn } from "~/lib/utils";
import { css } from "./style.css";
import { useSize } from "~/hooks/use-size";
import { useUser } from "~/hooks/use-user";

const icon = {
  big: 40,
  small: 20,
};

export function SettingLink() {
  // const hasUpdate = useCheckUpdate();
  const { pathname } = useLocation();
  const size = useSize();
  const role = useUser().role;
  return (
    <li
      className={cn(
        "rounded-t-full flex items-center px-3",
        css.setting[size],
        pathname.includes("/setting") ? "bg-white" : "bg-black text-white",
      )}
    >
      <Link to={role === "admin" ? "/setting/shop" : "/setting"} className="relative">
        <Settings size={icon[size]} />
        {/* <Show when={hasUpdate}>
					<BellRing
						size={icon[size]}
						className="text-red-500 animate-ring absolute -top-3 -right-3"
					/>
				</Show> */}
      </Link>
    </li>
  );
}
