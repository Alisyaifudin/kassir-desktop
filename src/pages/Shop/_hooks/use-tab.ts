import { useEffect } from "react";
import { getSheetList, useSheet } from "./use-sheet";
import { emptyState } from "./use-local-state";

export function useTabs() {
	const [sheet, setSheet, removeSheet, addSheet] = useSheet();
	const tabs = getSheetList();
	useEffect(() => {}, []);
	function addTab() {
		const i = addSheet();
		if (i === null) return;
		localStorage.setItem("state-" + i, JSON.stringify(emptyState));
	}
	function deleteTab(tab: number) {
		const tabs = removeSheet(tab);
		if (tabs.size === 0) {
			setSheet(0);
			return;
		}
		if (tab === sheet) {
			const remaining = Array.from(tabs.values())[0];
			setSheet(remaining);
		} else {
			setSheet(sheet);
		}
	}
	return [tabs, addTab, deleteTab] as const;
}
