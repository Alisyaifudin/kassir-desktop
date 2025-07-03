import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";
import { z } from "zod";
import { getURLBack } from "../_utils/get-url-back";

export function useTab(timestamp: number, mode: DB.Mode) {
	const [search, setSearch] = useSearchParams();
	const tab = useMemo(() => {
		const parsed = z.enum(["receipt", "detail"]).safeParse(search.get("tab"));
		const tab = parsed.success ? parsed.data : "receipt";
		return tab;
	}, [search]);
	const setTab = useCallback((tab: string) => {
		setSearch((prev) => {
			const search = new URLSearchParams(prev);
			search.set("tab", tab);
			return search;
		});
	}, [setSearch])
  const urlBack = getURLBack(timestamp, mode, search);
	return [tab, setTab, urlBack] as const;;
}
