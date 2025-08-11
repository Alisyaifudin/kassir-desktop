import { Context } from "../_utils/context";
import { ItemWithoutDisc, State } from "../_utils/schema";
import { LocalContext, SetState } from "./use-local-state";
import { produce } from "immer";

export function useItems(context: LocalContext) {
	const items = context.state.items;
	const setItems = {
		add: add(context),
		del: del(context),
		name: setName(context),
		price: setPrice(context),
		qty: setQty(context),
		barcode: setBarcode(context),
		discs: {
			add: addDisc(context),
			del: delDisc(context),
			value: setDiscValue(context),
			kind: setDiscKind(context),
		},
	};
	return [items, setItems] as const;
}

type Context = {
	state: State;
	setState: SetState;
};

function add(context: Context) {
	return (item: ItemWithoutDisc) => {
		const state = produce(context.state, (state) => {
			const index = state.items.findIndex(
				(prev) => prev.productId !== undefined && prev.productId === item.productId
			);
			if (index === -1) {
				state.items.push({ ...item, discs: [] });
			} else {
				state.items[index].qty += item.qty;
			}
		});
		context.setState(state);
	};
}

function del(context: Context) {
	return (index: number) => {
		const state = produce(context.state, (state) => {
			state.items = state.items.filter((_, i) => i !== index);
		});
		context.setState(state);
	};
}

function setName(context: Context) {
	return (index: number, name: string) => {
		const state = produce(context.state, (state) => {
			state.items[index].name = name;
		});
		context.setState(state);
	};
}
// function setName(context: Context) {
// 	return (index: number, name: string) => {
// 		const state = produce(context.state, (state) => {
// 			state.items[index].name = name;
// 		});
// 		context.setState(state);
// 	};
// }

function setBarcode(context: Context) {
	return (index: number, barcode: string) => {
		const state = produce(context.state, (state) => {
			state.items[index].barcode = barcode;
		});
		context.setState(state);
	};
}

function setPrice(context: Context) {
	return (index: number, price: number) => {
		const state = produce(context.state, (state) => {
			let val = price;
			if (val < 0) val = 0;
			if (val > 1e9) val = 1e9;
			state.items[index].price = val;
		});
		context.setState(state);
	};
}

function setQty(context: Context) {
	return (index: number, qty: number) => {
		const state = produce(context.state, (state) => {
			let val = qty;
			if (val < 0) val = 0;
			if (val > 1e9) val = 1e9;
			state.items[index].qty = val;
		});
		context.setState(state);
	};
}

function addDisc(context: Context) {
	return (index: number) => {
		const state = produce(context.state, (state) => {
			state.items[index].discs.push({
				kind: "percent",
				value: 0,
			});
		});
		context.setState(state);
	};
}

function delDisc(context: Context) {
	return (itemIdx: number, discIdx: number) => {
		const state = produce(context.state, (state) => {
			state.items[itemIdx].discs = state.items[itemIdx].discs.filter((_, i) => i !== discIdx);
		});
		context.setState(state);
	};
}
///
function setDiscKind(context: Context) {
	return (itemIdx: number, discIdx: number, kind: DB.ValueKind) => {
		const state = produce(context.state, (state) => {
			state.items[itemIdx].discs[discIdx].kind = kind;
			if (kind === "percent" && state.items[itemIdx].discs[discIdx].value > 100) {
				state.items[itemIdx].discs[discIdx].value = 100;
			}
		});
		context.setState(state);
	};
}

function setDiscValue(context: Context) {
	return (itemIdx: number, discIdx: number, value: number) => {
		const state = produce(context.state, (state) => {
			let val = value;
			if (state.items[itemIdx].discs[discIdx].kind === "percent" && val > 100) {
				val = 100;
			}
			if (val < 0) {
				val = 0;
			}
			state.items[itemIdx].discs[discIdx].value = val;
		});
		context.setState(state);
	};
}
