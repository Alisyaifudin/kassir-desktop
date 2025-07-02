import { useMemo } from "react";
import { SetURLSearchParams } from "react-router";
import { numeric } from "~/lib/utils";

export function usePage(search: URLSearchParams, setSearch: SetURLSearchParams) {
	const page = useMemo(() => {
		const parsed = numeric.safeParse(search.get("page"));
		let page = 1;
		if (parsed.data && parsed.data > 0) {
			page = parsed.data;
		}
		return page;
	}, [search]);
	const setPage = (page: number) => {
		setSearch((prev) => {
			const search = new URLSearchParams(prev);
			search.set("page", page.toString());
			return search;
		});
	};
	return [page, setPage] as const;
}
