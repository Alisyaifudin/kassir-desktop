import { Show } from "~/components/Show";
import { Button } from "~/components/ui/button";
import { capitalize } from "~/lib/utils";
import { useMode } from "../../_hooks/use-mode";
import { useUser } from "~/hooks/use-user";

export function Tab() {
	const [mode, setMode] = useMode();
	const user = useUser();
	return (
		<div className="flex gap-2 items-center justify-between">
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
			<p className="text-3xl px-2">Kasir: {capitalize(user.name)}</p>
		</div>
	);
}
