import { additional } from "./additional";
import { updateAdditionalManual } from "./additional-manual";
import { item } from "./item";
import { updateItemManual } from "./item-manual";
import { Additional, Item, State, stateSchema } from "../utils/schema";
import { METHOD_BASE_ID, safeJSON } from "~/lib/utils";

// BOOO 👻, GLOBAL VARIABLE!
export const STATES: Map<number, State> = new Map();
export const TabState = {
	tab: 0,
	get: {
		all() {
			if (STATES.size > 0) return STATES;
			return this.initialized();
		},
		one(tab: number) {
			return STATES.get(tab);
		},
		lastTab() {
			const keys = Array.from(STATES.keys());
			if (keys.length > 0) {
				return keys[keys.length - 1];
			}
			return undefined;
		},
	},
	new() {
		const keys = Array.from(STATES.keys());
		let tab = 0;
		for (; tab < TOTAL_STATE; tab++) {
			if (keys.includes(tab)) {
				continue;
			}
			break;
		}
		if (tab < TOTAL_STATE) {
			STATES.set(tab, empty);
			store(`state-${tab}`, empty);
			emitChange();
			return tab;
		}
		return null;
	},
	add: {
		item(tab: number, item: Item) {
			update(tab, (state) => {
				state.items.push(item);
				return state;
			});
		},
		additional(tab: number, additional: Additional) {
			update(tab, (state) => {
				state.additionals.push(additional);
				return state;
			});
		},
	},
	update: {
		fix(tab: number, fix: number) {
			update(tab, (state) => {
				state.fix = fix;
				return state;
			});
		},
		method(tab: number, id: number) {
			update(tab, (state) => {
				state.methodId = id;
				return state;
			});
		},
		note(tab: number, note: string) {
			update(tab, (state) => {
				state.note = note;
				return state;
			});
		},
		pay(tab: number, pay: number) {
			update(tab, (state) => {
				state.pay = pay;
				return state;
			});
		},
		mode(tab: number, mode: number) {
			update(tab, (state) => {
				state.pay = mode;
				return state;
			});
		},
		customer(tab: number, customer: DB.Customer | null) {
			update(tab, (state) => {
				state.customer = customer;
				return state;
			});
		},
	},
	itemManual: updateItemManual,
	additionalManual: updateAdditionalManual,
	item,
	additional,
};

export function update(tab: number, callback: (state: State) => State | null) {
	const curr = STATES.get(tab);
	if (curr === undefined) return;
	const updated = callback(curr);
	if (updated === null) return;
	STATES.set(tab, updated);
	store(`state-${tab}`, updated);
}

export function store(key: string, val: any) {
	return new Promise<void>((resolve, reject) => {
		queueMicrotask(() => {
			try {
				localStorage.setItem(key, JSON.stringify(val));
				resolve();
			} catch (error) {
				reject(error);
			}
		});
	});
}

const empty: State = {
	additionalManual: {
		kind: "percent",
		name: "",
		saved: false,
		value: 0,
	},
	itemManual: {
		barcode: "",
		name: "",
		price: 0,
		qty: 0,
		stock: 0,
	},
	additionals: [],
	items: [],
	customer: null,
	fix: 0,
	methodId: METHOD_BASE_ID.cash,
	mode: "sell",
	note: "",
	pay: 0,
	rounding: 0,
};

type Listener = () => void;
let listeners: Listener[] = [];

function emitChange() {
	for (let listener of listeners) {
		listener();
	}
}
