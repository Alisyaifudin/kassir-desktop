import { SetURLSearchParams } from "react-router";

export function getQuery(search: URLSearchParams): string {
	const query = search.get("query");
	if (query === null) {
		return "";
	}
	return query;
}

export function setQuery(setSearch: SetURLSearchParams, query: string) {
	const search = new URLSearchParams(window.location.search);
	search.set("query", query);
	setSearch(search);
}
