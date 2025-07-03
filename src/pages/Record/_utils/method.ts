import { SetURLSearchParams } from "react-router";
import { integer } from "~/lib/utils";

export function getMethod(methods: DB.Method[], search: URLSearchParams) {
	const methodId = integer.nullable().catch(null).parse(search.get("method"));
	const method = methods.find((m) => m.id === methodId) ?? null;
	return method;
}

export function setMethod(setSearch: SetURLSearchParams, methodId: number | null) {
	const search = new URLSearchParams(window.location.search);
	if (methodId === null) {
		search.delete("method");
	} else {
		search.set("method", methodId.toString());
	}
	setSearch(search);
}
