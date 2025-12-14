import { Additional, Discount, Item, State, stateSchema } from "./utils/schema";
import { METHOD_BASE_ID, safeJSON } from "~/lib/utils";
import { create } from "zustand";
import { produce } from "immer";

// BOOO 👻, GLOBAL VARIABLE!
// export const STATES: Map<number, State> = new Map();
export const TOTAL_STATE = 20;

export function initializedTab(): { states: Map<number, State>; last: number } {
	const states: Map<number, State> = new Map();
	let tab = 0;
	for (; tab < TOTAL_STATE; tab++) {
		const raw = localStorage.getItem(`state-${tab}`);
		if (raw === null) continue;
		const [errMsg, json] = safeJSON(raw);
		if (errMsg) {
			localStorage.removeItem(`state-${tab}`);
			continue;
		}
		const parsed = stateSchema.safeParse(json);
		if (!parsed.success) {
			localStorage.removeItem(`state-${tab}`);
			continue;
		}
		states.set(tab, parsed.data);
	}
	if (states.size === 0) {
		states.set(0, empty);
		store(0, empty);
		return { states, last: 0 };
	}
	return { states, last: tab };
}

// const arr: { tab: number; mode: DB.Mode }[] = [];
// for (const [key, val] of STATES.entries()) {
// 	arr.push({ tab: key, mode: val.mode });
// }
interface TabState {
	_tab: number;
	_state?: State;
	_states: Map<number, State>;
	tabs: {
		get: { tab: number; mode: DB.Mode }[];
		set: (tabs: { tab: number; mode: DB.Mode }[]) => void;
		add: () => number | undefined;
		remove: (tab: number) => number | undefined;
	};
	clear: () => void;
	get: () => State;
	getLastTab: () => number | undefined;
	set: {
		_states: (states: Map<number, State>) => void;
		_tab: (v: number) => void;
		note: (v: string) => void;
		rounding: (v: number) => void;
		pay: (v: number) => void;
		fix: (v: number) => void;
		methodId: (v: number) => void;
		mode: (v: "buy" | "sell") => void;
		customer: {
			update: (name: string, phone: string, isNew: boolean) => void;
			remove: () => void;
		};
		item: {
			add: (item: Item) => void;
			remove: (i: number) => void;
			update: {
				barcode: (i: number, v: string) => void;
				name: (i: number, v: string) => void;
				price: (i: number, v: number) => void;
				qty: (i: number, v: number) => void;
			};
			manual: {
				barcode: (v: string) => void;
				name: (v: string) => void;
				price: (v: number) => void;
				qty: (v: number) => void;
				stock: (v: number) => void;
				emptied: () => void;
			};
		};
		discount: {
			add: (i: number, discount: Discount) => void;
			remove: (i: number, indexDisc: number) => void;
			update: {
				value: (i: number, indexDisc: number, v: number) => void;
				kind: (i: number, indexDisc: number, v: "percent" | "number" | "pcs") => void;
			};
		};
		additional: {
			add: (additional: Additional) => void;
			remove: (i: number) => void;
			update: {
				name: (i: number, v: string) => void;
				value: (i: number, v: number) => void;
				kind: (i: number, v: "percent" | "number") => void;
				saved: (i: number, v: boolean) => void;
			};
			manual: {
				name: (v: string) => void;
				value: (v: number) => void;
				kind: (v: "percent" | "number") => void;
				saved: (v: boolean) => void;
				emptied: () => void;
			};
		};
	};
}

export const empty: State = {
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
	customer: {
		name: "",
		phone: "",
		isNew: false,
	},
	fix: 0,
	methodId: METHOD_BASE_ID.cash,
	mode: "sell",
	note: "",
	pay: 0,
	rounding: 0,
};

export const useTabState = create<TabState>((setter, getter) => ({
	_tab: -1,
	_state: undefined,
	_states: new Map(),
	tabs: {
		get: [],
		set(tabs) {
			setter(
				produce<TabState>((draft) => {
					draft.tabs.get = tabs;
				})
			);
		},
		add() {
			const { _states: states } = getter();
			let tab = 0;
			for (; tab < TOTAL_STATE; tab++) {
				if (states.has(tab)) continue;
				break;
			}
			if (tab === TOTAL_STATE) return undefined;
			setter(
				produce<TabState>((draft) => {
					draft._states.set(tab, empty);
					draft.tabs.get.push({ tab, mode: empty.mode });
				})
			);
			return tab;
		},
		remove(tab) {
			const { tabs: t } = getter();
			const tabs = t.get;
			const index = tabs.findIndex((t) => t.tab === tab);
			if (index === -1) {
				return undefined;
			}
			if (tabs.length === 1) {
				setter(
					produce<TabState>((draft) => {
						draft._states.delete(tab);
						draft._states.set(0, empty);
						draft.tabs.get = [{ tab: 0, mode: empty.mode }];
					})
				);
				return 0;
			}
			setter(
				produce<TabState>((draft) => {
					draft._states.delete(tab);
					draft.tabs.get = draft.tabs.get.filter((_, i) => i !== index);
				})
			);
			if (index === 0) {
				return tabs[index + 1].tab;
			}
			return tabs[index - 1].tab;
		},
	},
	clear() {
		const { _state: state, _tab: tab } = getter();
		if (state === undefined) return;
		setter(
			produce<TabState>((draft) => {
				draft._state = empty;
				store(tab, empty);
			})
		);
	},
	getLastTab() {
		const { _states } = getter();
		const tabs = Array.from(_states.keys());
		if (tabs.length === 0) return undefined;
		return tabs[tabs.length - 1];
	},
	get() {
		const tabstate = getter();
		if (tabstate._state === undefined) throw new Error("Invalid state");
		return tabstate._state;
	},
	set: {
		_states(states) {
			setter(
				produce<TabState>((draft) => {
					draft._states = states;
				})
			);
		},
		_tab(v) {
			const { _states } = getter();
			const state = _states.get(v);
			if (state === undefined) return;
			setter({ _tab: v, _state: state });
		},
		discount: {
			add(i, discount) {
				const { _state: state, _tab: tab } = getter();
				if (state === undefined) return;
				setter(
					produce<TabState>((draft) => {
						const state = draft._state!;
						state.items[i].discounts.push(discount);
						store(tab, state);
					})
				);
			},
			remove(i, indexDisc) {
				const { _state: state, _tab: tab } = getter();
				if (state === undefined) return;
				setter(
					produce<TabState>((draft) => {
						const state = draft._state!;
						state.items[i].discounts.splice(indexDisc, 1);
						store(tab, state);
					})
				);
			},
			update: {
				kind(i, indexDisc, v) {
					const { _state: state, _tab: tab } = getter();
					if (state === undefined) return;
					setter(
						produce<TabState>((draft) => {
							const state = draft._state!;
							state.items[i].discounts[indexDisc].kind = v;
							store(tab, state);
						})
					);
				},
				value(i, indexDisc, v) {
					const { _state: state, _tab: tab } = getter();
					if (state === undefined) return;
					setter(
						produce<TabState>((draft) => {
							const state = draft._state!;
							state.items[i].discounts[indexDisc].value = v;
							store(tab, state);
						})
					);
				},
			},
		},
		item: {
			manual: {
				emptied() {
					const { _state: state, _tab: tab } = getter();
					if (state === undefined) return;
					setter(
						produce<TabState>((draft) => {
							const state = draft._state!;
							state.itemManual.barcode = "";
							state.itemManual.name = "";
							state.itemManual.price = 0;
							state.itemManual.qty = 0;
							state.itemManual.stock = 0;
							store(tab, state);
						})
					);
				},
				barcode(v) {
					const { _state: state, _tab: tab } = getter();
					if (state === undefined) return;
					setter(
						produce<TabState>((draft) => {
							const state = draft._state!;
							state.itemManual.barcode = v;
							store(tab, state);
						})
					);
				},
				name(v) {
					const { _state: state, _tab: tab } = getter();
					if (state === undefined) return;
					setter(
						produce<TabState>((draft) => {
							const state = draft._state!;
							state.itemManual.name = v;
							store(tab, state);
						})
					);
				},
				price(v) {
					const { _state: state, _tab: tab } = getter();
					if (state === undefined) return;
					setter(
						produce<TabState>((draft) => {
							const state = draft._state!;
							state.itemManual.price = v;
							store(tab, state);
						})
					);
				},
				stock(v) {
					const { _state: state, _tab: tab } = getter();
					if (state === undefined) return;
					setter(
						produce<TabState>((draft) => {
							const state = draft._state!;
							state.itemManual.stock = v;
							store(tab, state);
						})
					);
				},
				qty(v) {
					const { _state: state, _tab: tab } = getter();
					if (state === undefined) return;
					setter(
						produce<TabState>((draft) => {
							const state = draft._state!;
							state.itemManual.qty = v;
							store(tab, state);
						})
					);
				},
			},

			add(item) {
				const { _state: state, _tab: tab } = getter();
				if (state === undefined) return;
				setter(
					produce<TabState>((draft) => {
						const state = draft._state!;
						state.items.push(item);
						store(tab, state);
					})
				);
			},
			remove(i) {
				const { _state: state, _tab: tab } = getter();
				if (state === undefined) return;
				setter(
					produce<TabState>((draft) => {
						const state = draft._state!;
						state.items.splice(i, 1);
						store(tab, state);
					})
				);
			},
			update: {
				barcode(i, v) {
					const { _state: state, _tab: tab } = getter();
					if (state === undefined) return;
					setter(
						produce<TabState>((draft) => {
							const state = draft._state!;
							state.items[i].barcode = v;
							store(tab, state);
						})
					);
				},
				name(i, v) {
					const { _state: state, _tab: tab } = getter();
					if (state === undefined) return;
					setter(
						produce<TabState>((draft) => {
							const state = draft._state!;
							state.items[i].name = v;
							store(tab, state);
						})
					);
				},
				price(i, v) {
					const { _state: state, _tab: tab } = getter();
					if (state === undefined) return;
					setter(
						produce<TabState>((draft) => {
							const state = draft._state!;
							state.items[i].price = v;
							store(tab, state);
						})
					);
				},
				qty(i, v) {
					const { _state: state, _tab: tab } = getter();
					if (state === undefined) return;
					setter(
						produce<TabState>((draft) => {
							const state = draft._state!;
							state.items[i].qty = v;
							store(tab, state);
						})
					);
				},
			},
		},
		additional: {
			manual: {
				kind(v) {
					const { _state: state, _tab: tab } = getter();
					if (state === undefined) return;
					setter(
						produce<TabState>((draft) => {
							const state = draft._state!;
							state.additionalManual.kind = v;
							store(tab, state);
						})
					);
				},
				name(v) {
					const { _state: state, _tab: tab } = getter();
					if (state === undefined) return;
					setter(
						produce<TabState>((draft) => {
							const state = draft._state!;
							state.additionalManual.name = v;
							store(tab, state);
						})
					);
				},
				value(v) {
					const { _state: state, _tab: tab } = getter();
					if (state === undefined) return;
					setter(
						produce<TabState>((draft) => {
							const state = draft._state!;
							state.additionalManual.value = v;
							store(tab, state);
						})
					);
				},
				saved(v) {
					const { _state: state, _tab: tab } = getter();
					if (state === undefined) return;
					setter(
						produce<TabState>((draft) => {
							const state = draft._state!;
							state.additionalManual.saved = v;
							store(tab, state);
						})
					);
				},
				emptied() {
					const { _state: state, _tab: tab } = getter();
					if (state === undefined) return;
					setter(
						produce<TabState>((draft) => {
							const state = draft._state!;
							state.additionalManual.name = "";
							state.additionalManual.value = 0;
							state.additionalManual.saved = false;
							store(tab, state);
						})
					);
				},
			},
			add(additional) {
				const { _state: state, _tab: tab } = getter();
				if (state === undefined) return;
				setter(
					produce<TabState>((draft) => {
						const state = draft._state!;
						state.additionals.push(additional);
						store(tab, state);
					})
				);
			},
			remove(i) {
				const { _state: state, _tab: tab } = getter();
				if (state === undefined) return;
				setter(
					produce<TabState>((draft) => {
						const state = draft._state!;
						state.additionals.splice(i, 1);
						store(tab, state);
					})
				);
			},
			update: {
				kind(i, v) {
					const { _state: state, _tab: tab } = getter();
					if (state === undefined) return;
					setter(
						produce<TabState>((draft) => {
							const state = draft._state!;
							state.additionals[i].kind = v;
							store(tab, state);
						})
					);
				},
				name(i, v) {
					const { _state: state, _tab: tab } = getter();
					if (state === undefined) return;
					setter(
						produce<TabState>((draft) => {
							const state = draft._state!;
							state.additionals[i].name = v;
							store(tab, state);
						})
					);
				},
				saved(i, v) {
					const { _state: state, _tab: tab } = getter();
					if (state === undefined) return;
					setter(
						produce<TabState>((draft) => {
							const state = draft._state!;
							state.additionals[i].saved = v;
							store(tab, state);
						})
					);
				},
				value(i, v) {
					const { _state: state, _tab: tab } = getter();
					if (state === undefined) return;
					setter(
						produce<TabState>((draft) => {
							const state = draft._state!;
							state.additionals[i].value = v;
							store(tab, state);
						})
					);
				},
			},
		},
		customer: {
			update(name, phone, isNew) {
				const { _state: state, _tab: tab } = getter();
				if (state === undefined) return;
				setter(
					produce<TabState>((draft) => {
						const state = draft._state!;
						state.customer = {
							name,
							phone,
							isNew,
						};
						store(tab, state);
					})
				);
			},
			remove() {
				const { _state: state, _tab: tab } = getter();
				if (state === undefined) return;
				setter(
					produce<TabState>((draft) => {
						const state = draft._state!;
						state.customer = {
							name: "",
							phone: "",
							isNew: false,
						};
						store(tab, state);
					})
				);
			},
		},
		note(v) {
			const { _state: state, _tab: tab } = getter();
			if (state === undefined) return;
			setter(
				produce<TabState>((draft) => {
					const state = draft._state!;
					state.note = v;
					store(tab, state);
				})
			);
		},
		mode(v) {
			const { _state: state, _tab: tab } = getter();
			if (state === undefined) return;
			setter(
				produce<TabState>((draft) => {
					const state = draft._state!;
					state.mode = v;
					store(tab, state);
				})
			);
		},
		methodId(v) {
			const { _state: state, _tab: tab } = getter();
			if (state === undefined) return;
			setter(
				produce<TabState>((draft) => {
					const state = draft._state!;
					state.methodId = v;
					store(tab, state);
				})
			);
		},
		pay(v) {
			const { _state: state, _tab: tab } = getter();
			if (state === undefined) return;
			setter(
				produce<TabState>((draft) => {
					const state = draft._state!;
					state.pay = v;
					store(tab, state);
				})
			);
		},
		fix(v) {
			const { _state: state, _tab: tab } = getter();
			if (state === undefined) return;
			setter(
				produce<TabState>((draft) => {
					const state = draft._state!;
					state.fix = v;
					store(tab, state);
				})
			);
		},
		rounding(v) {
			const { _state: state, _tab: tab } = getter();
			if (state === undefined) return;
			setter(
				produce<TabState>((draft) => {
					const state = draft._state!;
					state.rounding = v;
					store(tab, state);
				})
			);
		},
	},
}));

function store(tab: number, state: State) {
	const str = JSON.stringify(state);
	return new Promise<void>((resolve, reject) => {
		queueMicrotask(() => {
			try {
				localStorage.setItem(`state-${tab}`, str);
				resolve();
			} catch (error) {
				reject(error);
			}
		});
	});
}
// type Setter = (setter: State) => void;
// export let setters: Setter[] = [];

// function emitChange(state: State) {
// 	for (let setter of setters) {
// 		setter(state);
// 	}
// }

// export function useTabState() {
// 	const [tab] = useTab();
// 	const [state, setState] = useState<State | undefined>(
// 		tab === undefined ? undefined : STATES.get(tab)
// 	);
// 	useEffect(() => {
// 		if (tab === undefined) return;
// 		setters.push(setState);
// 		return () => {
// 			setters = setters.filter((s) => s !== setState);
// 		};
// 	}, []);

// 	const set = useMemo(
// 		() => ({
// 			item: {
// 				add(item: Item) {
// 					if (state === undefined) return;
// 					const s = structuredClone(state);
// 					s.items.push(item);
// 					emitChange(s);
// 				},
// 			},
// 		}),
// 		[tab]
// 	);
// 	return [state, set] as const;
// }
