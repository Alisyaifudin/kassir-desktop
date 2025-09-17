import { useSearchParams } from "react-router";
import { z } from "zod";
import { numeric, safeJSON } from "~/lib/utils";

export function useSheet() {
	const [search, setSearch] = useSearchParams();
	const parsed = numeric.safeParse(search.get("sheet"));
	function setSheet(sheet: number) {
		const sheets = getSheetList();
		if (sheets.size === 0) {
			localStorage.setItem("sheets", `[0]`);
			sheet = 0;
		}
		if (!sheets.has(sheet)) {
			const list = Array.from(sheets.values());
			sheet = list[0];
		}
		if (sheet < 0 || sheet > 100) {
			return;
		}
		setSearch((prev) => {
			const search = new URLSearchParams(prev);
			search.set("sheet", sheet.toString());
			return search;
		});
	}
	let sheet = 0;
	const sheets = getSheetList();
	if (!parsed.success) {
		const list = Array.from(sheets.values());
		sheet = list[0];
	} else {
		const proposed = parsed.data;
		if (sheets.has(proposed)) {
			sheet = proposed;
		} else {
			const list = Array.from(sheets.values());
			sheet = list[0];
		}
	}
	function removeSheet(sheet: number) {
		const sheets = getSheetList();
		sheets.delete(sheet);
		localStorage.setItem("sheets", JSON.stringify(Array.from(sheets.values())));
		return sheets;
	}
	function addSheet() {
		const tabs = getSheetList();
		for (let i = 0; i < 100; i++) {
			const empty = tabs.has(i);
			if (!empty) {
				tabs.add(i);
				localStorage.setItem("sheets", JSON.stringify(Array.from(tabs.values())));
				setSheet(i);
				return i;
			}
		}
		return null;
	}
	return [sheet, setSheet, removeSheet, addSheet] as const;
}
// store sheets in local storage too, so does not necessarily number 0
// at least have one item
export function getSheetList() {
	const [errJson, obj] = safeJSON(localStorage.getItem("sheets") ?? "[]");
	if (errJson !== null) {
		localStorage.setItem("sheets", `[0]`);
		const set = new Set([0]);
		return set;
	}
	const parsed = z.number().int().array().safeParse(obj);
	if (!parsed.success) {
		localStorage.setItem("sheets", `[0]`);
		const set = new Set([0]);
		return set;
	}
	const set = new Set(parsed.data);
	if (set.size === 0) {
		localStorage.setItem("sheets", `[0]`);
		set.add(0);
	}
	return set;
}
