import { SetURLSearchParams } from "react-router";
import { z } from "zod";


export function getMode(search: URLSearchParams) {
	const parsed = z.enum(["sell", "buy"]).safeParse(search.get("mode"));
	const mode = parsed.success ? parsed.data : "sell";
	return mode;
}

export function setMode(setSearch: SetURLSearchParams, mode: "sell" | "buy") {
	const search = new URLSearchParams(window.location.search);
	search.set("mode", mode);
	search.delete("selected");
	setSearch(search);
}
