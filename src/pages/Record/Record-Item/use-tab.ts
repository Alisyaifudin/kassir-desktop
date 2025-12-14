import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";
import { z } from "zod";

export function useTab() {
	const [search, setSearch] = useSearchParams();
	const tab = useMemo(() => {
		const parsed = z.enum(["receipt", "detail"]).safeParse(search.get("tab"));
		const tab = parsed.success ? parsed.data : "receipt";
		return tab;
	}, [search]);
	const setTab = useCallback(
		(tab: string) => {
			setSearch((prev) => {
				const search = new URLSearchParams(prev);
				search.set("tab", tab);
				return search;
			});
		},
		[setSearch]
	);
	return [tab, setTab] as const;
}
