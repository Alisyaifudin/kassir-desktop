import { z } from "zod";
import { safeJSON } from "~/lib/utils";
import { State, stateSchema } from "../_utils/schema";
import { useCallback, useEffect, useState } from "react";
import { useSheet } from "./use-sheet";

export type SetState = (state: State) => void;

export type LocalContext = {
	state: State;
	setState: SetState;
	clear: () => void;
};

export function useLocalState(
	mode: DB.Mode,
	methods: DB.Method[]
): {
	state: null | State;
	setState: SetState;
	clear: () => void;
} {
	const [sheet, setSheet] = useSheet();
	const [state, setState] = useState<null | State>(null);
	useEffect(() => {
		const state = getState(mode, methods, sheet);
		if (state === null) {
			setSheet(0);
			return;
		}
		setState({ ...state, methods });
	}, [mode, methods, sheet]);
	const setStateDI: SetState = useCallback(
		(p: State) => {
			setState(p);
			setItemAsync(keyItem[mode] + "-" + sheet, JSON.stringify(p));
		},
		[mode, methods, sheet]
	);
	function clear() {
		let num = 0;
		for (let i = 0; i < 100; i++) {
			const sell = localStorage.getItem(keyItem.sell + "-" + i);
			const buy = localStorage.getItem(keyItem.buy + "-" + i);
			if (sell === null && buy === null) continue;
			num++;
		}
		if (num === 1) {
			setStateDI(emptyState);
			return;
		}
		localStorage.removeItem(keyItem[mode] + "-" + sheet);
	}
	return { state, setState: setStateDI, clear };
}

export const defaultMethod = { id: 1000, method: "cash" as const, name: null };

export const emptyState: State = {
	pay: 0,
	fix: 0,
	rounding: 0,
	method: defaultMethod, // cash
	discKind: "percent",
	discVal: 0,
	note: "",
	items: [],
	additionals: [],
	methods: [defaultMethod],
	customer: {
		name: "",
		phone: "",
		isNew: false,
	},
};

const keyItem = {
	buy: `state-buy`,
	sell: `state-sell`,
} as const;

function getState(mode: DB.Mode, methods: DB.Method[], sheet: number): State | null {
	const key = keyItem[mode] + "-" + sheet;
	const parsed = z.string().safeParse(localStorage.getItem(key));
	if (!parsed.success) {
		if (sheet !== 0) {
			return null;
		}
		const state = emptyState;
		setItemAsync(key, JSON.stringify(state));
		return state;
	}
	const [errMsg, obj] = safeJSON(parsed.data);
	if (errMsg) {
		if (sheet !== 0) {
			return null;
		}
		const state = emptyState;
		setItemAsync(key, JSON.stringify(state));
		return state;
	}
	const parsedObj = stateSchema.safeParse(obj);
	if (!parsedObj.success) {
		if (sheet !== 0) {
			return null;
		}
		const state = emptyState;
		setItemAsync(key, JSON.stringify(state));
		return state;
	}
	return { ...parsedObj.data, methods };
}

function setItemAsync(key: string, value: string): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(() => {
			localStorage.setItem(key, value);
			resolve();
		}, 0);
	});
}
