import { z } from "zod";
import { safeJSON } from "~/lib/utils";
import { State, stateSchema } from "../_utils/schema";
import { useCallback, useEffect, useState } from "react";

export type SetState = (state: State) => void;

export type LocalContext = {
	state: State;
	setState: SetState;
};

export function useLocalState(
	mode: DB.Mode,
	methods: DB.Method[]
): {
	state: null | State;
	setState: SetState;
} {
	const [state, setState] = useState<null | State>(null);
	useEffect(() => {
		const state = getState(mode, methods);
		setState({ ...state, methods });
	}, [mode, methods]);
	const setStateDI: SetState = useCallback(
		(p: State) => {
			setState(p);
			setItemAsync(keyItem[mode], JSON.stringify(p));
		},
		[mode, methods]
	);
	return { state, setState: setStateDI };
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
};

const keyItem = {
	buy: `state-buy`,
	sell: `state-sell`,
} as const;

function getState(mode: DB.Mode, methods: DB.Method[]): State {
	const parsed = z.string().safeParse(localStorage.getItem(keyItem[mode]));
	if (!parsed.success) {
		const state = emptyState;
		setItemAsync(keyItem[mode], JSON.stringify(state));
		return state;
	}
	const [errMsg, obj] = safeJSON(parsed.data);
	if (errMsg) {
		const state = emptyState;
		setItemAsync(keyItem[mode], JSON.stringify(state));
		return state;
	}
	const parsedObj = stateSchema.safeParse(obj);
	if (!parsedObj.success) {
		const state = emptyState;
		setItemAsync(keyItem[mode], JSON.stringify(state));
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
