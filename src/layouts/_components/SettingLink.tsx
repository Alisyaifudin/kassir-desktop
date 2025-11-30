import { BellRing, Settings } from "lucide-react";
import { Link, useLocation } from "react-router";
import { Show } from "~/components/Show";
import { cn } from "~/lib/utils";
import { useCheckUpdate } from "../_hooks/use-check-update";
import { Size } from "~/hooks/use-size";

const icon = {
	big: 35,
	small: 20,
};

const liHeight = {
	big: {
		height: "60px",
	},
	small: {
		height: "30px",
	},
};

export function SettingLink({ size }: { size: Size }) {
	const hasUpdate = useCheckUpdate();
	const { pathname } = useLocation();
	return (
		<li
			style={liHeight[size]}
			className={cn(
				"rounded-t-full flex items-center p-5",
				pathname.includes("/setting") ? "bg-white" : "bg-black text-white"
			)}
		>
			<Link to="/setting" className="relative">
				<Settings size={icon[size]} />
				<Show when={hasUpdate}>
					<BellRing
						size={icon[size]}
						className="text-red-500 animate-ring absolute -top-3 -right-3"
					/>
				</Show>
			</Link>
		</li>
	);
}
