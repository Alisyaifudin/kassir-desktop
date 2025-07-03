import { SetURLSearchParams } from "react-router";
import { getMethod, setMethod } from "./method";
import { getMode, setMode } from "./mode";
import { getQuery, setQuery } from "./query";
import { getSelected, setSelected } from "./selected";
import { getTime, setTime } from "./time";

export function getParam(search: URLSearchParams) {
	return {
		mode: getMode(search),
		method: (methods: DB.Method[]) => getMethod(methods, search),
		query: getQuery(search),
		selected: getSelected(search),
		time: getTime(search),
	};
}

export function setParam(setSearch: SetURLSearchParams) {
	return {
		mode: (mode: DB.Mode) => setMode(setSearch, mode),
		method: (methodId: number | null) => setMethod(setSearch, methodId),
		query: (query: string) => setQuery(setSearch, query),
		selected: (clicked: number, selected: number|null) =>
			setSelected(setSearch, clicked, selected),
		time: (timestamp: number) => setTime(setSearch, timestamp),
	};
}
