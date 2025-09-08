import { useSearchParams } from "react-router";
import { z } from "zod";

export function useMode() {
	const [search, setSearch] = useSearchParams();
	const mode = z.enum(["buy", "sell"]).catch("sell").parse(search.get("mode"));
	function setMode(mode: string) {
		setSearch((prev) => {
			const search = new URLSearchParams(prev);
			search.set("mode", mode);
			return search;
		});
	}
	return [mode, setMode] as const;
}
