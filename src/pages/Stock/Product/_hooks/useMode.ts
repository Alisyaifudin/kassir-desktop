import { useMemo } from "react";
import { SetURLSearchParams } from "react-router";
import { z } from "zod";

export function useMode(search: URLSearchParams, setSearch: SetURLSearchParams) {
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
