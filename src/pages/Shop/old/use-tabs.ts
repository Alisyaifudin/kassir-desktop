import { useEffect } from "react";
import { empty, STATES, TOTAL_STATE } from "./use-tab-state";
import { create } from "zustand";

const useTabsStore = create<{
	tabs: { tab: number; mode: DB.Mode }[];
	setTabs: (tabs: { tab: number; mode: DB.Mode }[]) => void;
}>((set) => ({
	tabs: [],
	setTabs(tabs) {
		set({ tabs });
	},
}));

export function useTabs() {
	const { tabs, setTabs } = useTabsStore();
	useEffect(() => {
		const arr: { tab: number; mode: DB.Mode }[] = [];
		for (const [key, val] of STATES.entries()) {
			arr.push({ tab: key, mode: val.mode });
		}
		setTabs(arr);
	}, []);
	function add() {
		let tab = 0;
		for (; tab < TOTAL_STATE; tab++) {
			if (STATES.has(tab)) continue;
			break;
		}
		if (tab === TOTAL_STATE) return undefined;
		STATES.set(tab, empty);
		setTabs([...tabs, { tab, mode: "sell" }]);
		return tab;
	}
	function remove(tab: number) {
		const index = tabs.findIndex((t) => t.tab === tab);
		if (index === -1) {
			return undefined;
		}
		STATES.delete(tab);
		const filtered = tabs.filter((_, i) => i !== index);
		setTabs(filtered);
		if (tabs.length === 1) {
			STATES.set(0, empty);
			return 0;
		}
		if (index === 0) {
			return tabs[index + 1].tab;
		}
		STATES.set(tab, empty);
		setTabs([{ tab: 0, mode: "sell" }]);
		return tabs[index - 1].tab;
	}
	return { tabs, add, remove };
}
