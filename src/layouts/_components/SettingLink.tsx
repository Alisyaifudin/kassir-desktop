import { BellRing, Settings } from "lucide-react";
import { Link, useLocation } from "react-router";
import { Show } from "~/components/Show";
import { cn } from "~/lib/utils";
import { useCheckUpdate } from "../_hooks/use-check-update";

export function SettingLink() {
	const hasUpdate = useCheckUpdate();
	const { pathname } = useLocation();
	return (
		<li
			className={cn(
				"rounded-t-full h-[60px] flex items-center p-5",
				pathname.includes("/setting") ? "bg-white" : "bg-black text-white"
			)}
		>
			<Link to="/setting" className="relative">
				<Settings size={35} />
				<Show when={hasUpdate}>
					<BellRing className="text-red-500 animate-ring absolute -top-3 -right-3" />
				</Show>
			</Link>
		</li>
	);
}
