import { Show } from "~/components/Show";
import { Button } from "~/components/ui/button";
import { useMode } from "~/pages/Shop/use-mode";
import { useUser } from "~/hooks/use-user";
import { useTabs } from "../use-tab";
import { Plus } from "lucide-react";
import { SheetTab } from "./SheetTab";

export function Tab() {
	const [, addTab] = useTabs();
	return (
		<div className="flex gap-2 items-center justify-between">
			<div className="flex items-center gap-1">
				<Button className="p-2 rounded-full" onClick={addTab}>
					<Plus />
				</Button>
				<SheetTab />
			</div>
			<ModeTab />
		</div>
	);
}

function ModeTab() {
	const [mode, setMode] = useMode();
	const user = useUser();
	return (
		<div className="flex items-center gap-1">
			<Button
				className={mode === "sell" ? "text-2xl font-bold" : "text-black/50"}
				variant={mode === "sell" ? "default" : "ghost"}
				onClick={() => setMode("sell")}
				type="button"
			>
				Jual
			</Button>
			<Show when={user.role === "admin"}>
				<Button
					className={mode === "buy" ? "text-2xl font-bold" : "text-black/50"}
					variant={mode === "buy" ? "default" : "ghost"}
					onClick={() => setMode("buy")}
					type="button"
				>
					Beli
				</Button>
			</Show>
		</div>
	);
}
