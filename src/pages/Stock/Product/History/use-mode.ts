import { useMemo } from "react";
import { useSearchParams } from "react-router";
import { z } from "zod";

export function useMode() {
	const [search, setSearch] = useSearchParams();
	const mode = useMemo(() => {
		const mode = z.enum(["sell", "buy"]).catch("sell").parse(search.get("mode"));
		return mode;
	}, [search]);
	const setMode = (mode: "buy" | "sell") => {
		setSearch((prev) => {
			const search = new URLSearchParams(prev);
			search.set("mode", mode);
			return search;
		});
	};
	return [mode, setMode] as const;
}
