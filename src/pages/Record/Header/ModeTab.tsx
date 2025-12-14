import { useSearchParams } from "react-router";
import { getParam, setParam } from "../utils/params";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

export function ModeTab() {
	const [search, setSearch] = useSearchParams();
	const mode = getParam(search).mode;
	const setMode = setParam(setSearch).mode;
	return (
		<div className="flex items-center gap-1 px-1 rounded-lg bg-muted">
			<Button
				variant="ghost"
				className={cn({ "bg-background shadow hover:bg-background/70": mode === "sell" })}
				onClick={() => setMode("sell")}
			>
				Jual
			</Button>
			<Button
				variant="ghost"
				className={cn({ "bg-background shadow hover:bg-background/70": mode === "buy" })}
				onClick={() => setMode("buy")}
			>
				Beli
			</Button>
		</div>
	);
}
