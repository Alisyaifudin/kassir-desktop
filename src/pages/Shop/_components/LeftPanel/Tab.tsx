import { Show } from "~/components/Show";
import { Button } from "~/components/ui/button";
import { User } from "~/lib/auth";
import { capitalize } from "~/lib/utils";

export function Tab({
	mode,
	setMode,
	user,
}: {
	mode: DB.Mode;
	setMode: (mode: DB.Mode) => void;
	user: User;
}) {
	return (
		<div className="flex gap-2 items-center justify-between">
			<div className="flex items-center gap-1">
				<Button
					className={mode === "sell" ? "text-2xl font-bold" : "text-black/50"}
					variant={mode === "sell" ? "default" : "ghost"}
					onClick={() => setMode("sell")}
				>
					Jual
				</Button>
				<Show when={user.role === "admin"}>
					<Button
						className={mode === "buy" ? "text-2xl font-bold" : "text-black/50"}
						variant={mode === "buy" ? "default" : "ghost"}
						onClick={() => setMode("buy")}
					>
						Beli
					</Button>
				</Show>
			</div>
			<p className="text-3xl px-2">Kasir: {capitalize(user.name)}</p>
		</div>
	);
}
