import { useMemo } from "react";
import { SetURLSearchParams } from "react-router";
import { z } from "zod";

export function useTab(search: URLSearchParams, setSearch: SetURLSearchParams) {
	const tab = useMemo(() => {
		const tab = z.enum(["history", "image"]).catch("history").parse(search.get("tab"));
		return tab;
	}, [search]);
	const setTab = (val: string) => {
		const tab = z.enum(["history", "image"]).catch("history").parse(val);
		setSearch((prev) => {
			const search = new URLSearchParams(prev);
			search.set("tab", tab);
			return search;
		});
	};
  return [tab, setTab] as const;
}
