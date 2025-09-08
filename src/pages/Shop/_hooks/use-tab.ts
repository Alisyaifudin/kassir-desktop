import { useEffect, useState } from "react";
import { useMode } from "./use-mode";
import { useSheet } from "./use-sheet";
import { emptyState } from "./use-local-state";

const keyItem = {
	buy: `state-buy`,
	sell: `state-sell`,
} as const;

export function useTabs() {
	const [mode] = useMode();
	const [sheet, setSheet] = useSheet();
	const [tabs, setTabs] = useState(new Set<number>());
	useEffect(() => {
		const tabs = new Set<number>();
		for (let i = 0; i < 100; i++) {
			const sell = localStorage.getItem(keyItem.sell + "-" + i);
			const buy = localStorage.getItem(keyItem.buy + "-" + i);
			if (sell === null && buy === null) {
				continue;
			}
			tabs.add(i);
		}
		setTabs(tabs);
	}, []);
	function addTab() {
		for (let i = 1; i < 100; i++) {
			const empty = tabs.has(i);
			if (!empty) {
				setTabs((prev) => {
					const tabs = new Set(prev);
					tabs.add(i);
					localStorage.setItem(keyItem[mode] + "-" + i, JSON.stringify(emptyState));
					return tabs;
				});
				setSheet(i);
				break;
			}
		}
	}
	function deleteTab(tab: number) {
		if (tabs.size === 1) return;
		if (tab === 0) {
			let i = 1;
			for (; i < 99; i++) {
				if (tabs.has(i)) {
					break;
				}
			}
			const sell = localStorage.getItem(keyItem.sell + "-" + i);
			const buy = localStorage.getItem(keyItem.buy + "-" + i);
			setTabs((prev) => {
				const tabs = new Set(prev);
				tabs.delete(i);
				return tabs;
			});
			if (sell !== null) localStorage.setItem(keyItem.sell + "-0", sell);
			if (buy !== null) localStorage.setItem(keyItem.buy + "-0", buy);
			localStorage.removeItem(keyItem.sell + "-" + i);
			localStorage.removeItem(keyItem.buy + "-" + i);
			window.location.reload();
			return;
		}
		localStorage.removeItem(keyItem.sell + "-" + tab);
		localStorage.removeItem(keyItem.buy + "-" + tab);
		setTabs((prev) => {
			const tabs = new Set(prev);
			tabs.delete(tab);
			return tabs;
		});
		let i = tab - 1;
		for (; i >= 0; i--) {
			if (tabs.has(i)) break;
		}
		if (tab === sheet) {
			setSheet(i);
		}
	}
	return [tabs, addTab, deleteTab] as const;
}
