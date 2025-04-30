import { LeftPanel } from "./LeftPanel";
import { z } from "zod";
import { RightPanel } from "./RightPanel";

export default function Page() {
	// const [state, dispatch] = useReducer(itemReducer, { items: [], taxes: [] });
	// const reset = () => dispatch({ action: "reset" });
	return (
		<main className="gap-2 p-2 flex min-h-0 grow shrink basis-0">
			<LeftPanel mode={mode} />
			<RightPanel />
		</main>
	);
}

export function getMode(search: URLSearchParams): "sell" | "buy" {
	const parsed = z.enum(["sell", "buy"]).safeParse(search.get("mode"));
	const mode = parsed.success ? parsed.data : "sell";
	return mode;
}

function setMode(setSearch: SetURLSearchParams, reset?: () => void) {
	return function (mode: "sell" | "buy") {
		setSearch({ mode });
		reset?.();
	};
}

