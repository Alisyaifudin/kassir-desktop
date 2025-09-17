import { z } from "zod";
import { safeJSON } from "~/lib/utils";
import { State, stateSchema } from "../_utils/schema";
import { useCallback, useEffect, useState } from "react";
import { getSheetList, useSheet } from "./use-sheet";

export type SetState = (state: State) => void;

export type LocalContext = {
	state: State;
	setState: SetState;
	clear: (del?: boolean) => void;
};

export function useLocalState(methods: DB.Method[]): {
	state: null | State;
	setState: SetState;
	clear: (del?: boolean) => void;
} {
	const [sheet, setSheet, removeSheet] = useSheet();
	const [state, setState] = useState<null | State>(null);
	useEffect(() => {
		const state = getState(methods, sheet);
		if (state === null) {
			setSheet(0);
			return;
		}
		setState({ ...state, methods });
	}, [methods, sheet]);
	const setStateDI: SetState = useCallback(
		(p: State) => {
			setState(p);
			setItemAsync("state-" + sheet, JSON.stringify(p));
		},
		[methods, sheet]
	);
	function clear(del = true) {
		if (del) {
			removeSheet(sheet);
			localStorage.removeItem("state-" + sheet);
		} else {
			setState(emptyState);
			setItemAsync("state-" + sheet, JSON.stringify(emptyState));
		}
	}
	return { state, setState: setStateDI, clear };
}

export const defaultMethod = { id: 1000, method: "cash" as const, name: null };

export const emptyState: State = {
	mode: "sell",
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

// const keyItem = {
// 	buy: `state-buy`,
// 	sell: `state-sell`,
// } as const;

export function getState(methods: DB.Method[], sheet: number): State | null {
	const key = "state-" + sheet;
	const sheets = getSheetList();
	if (sheets.size === 0) {
		if (sheet !== 0) {
			return null;
		}
		setItemAsync("state-0", JSON.stringify(emptyState));
		return emptyState;
	}
	const parsed = z.string().safeParse(localStorage.getItem(key));
	if (!parsed.success) {
		if (!sheets.has(sheet)) {
			return null;
		}
		const state = emptyState;
		setItemAsync(key, JSON.stringify(state));
		return state;
	}
	const [errMsg, obj] = safeJSON(parsed.data);
	if (errMsg) {
		if (!sheets.has(sheet)) {
			return null;
		}
		const state = emptyState;
		setItemAsync(key, JSON.stringify(state));
		return state;
	}
	const parsedObj = stateSchema.safeParse(obj);
	if (!parsedObj.success) {
		if (!sheets.has(sheet)) {
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
