import { SetURLSearchParams } from "react-router";

export function getSelected(search: URLSearchParams): number | null {
	const selected = search.get("selected");
	if (selected === null || Number.isNaN(selected)) {
		return null;
	}
	return Number(selected);
}

export function setSelected(
	setSearch: SetURLSearchParams,
	clicked: number,
	selected: number | null
) {
	const search = new URLSearchParams(window.location.search);
	if (clicked === selected) {
		search.delete("selected");
	} else {
		search.set("selected", clicked.toString());
	}
	setSearch(search);
}
