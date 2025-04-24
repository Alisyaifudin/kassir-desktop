import { produce } from "immer";
import { Item } from "./Item";
import { createContext } from "react";

export type Tax = {
	name: string;
	value: number;
};

export const ItemContext = createContext<{
	state: State;
	dispatch: React.Dispatch<Action>;
	variant: "sell" | "buy"
}>({ state: { items: [], taxes: [] }, dispatch: () => {}, variant: "sell" });
export const ItemContextProvider = ItemContext.Provider;

export type State = { items: Item[]; taxes: Tax[] };
export type Action =
	| { action: "delete"; index: number }
	| { action: "edit-name"; index: number; name: string }
	| { action: "edit-price"; index: number; price: string }
	| { action: "edit-qty"; index: number; qty: string }
	| { action: "edit-disc-val"; index: number; value: string }
	| { action: "edit-disc-type"; index: number; type: string }
	| { action: "edit-disc-type"; index: number; type: string }
	| { action: "add-tax"; name: string; value: number }
	| { action: "delete-tax"; index: number }
	| {
			action: "add-manual";
			data: {
				name: string;
				price: string;
				qty: string;
				disc: {
					type: "number" | "percent";
					value: string;
				};
			};
	  }
	| {
			action: "add-select";
			data: {
				name: string;
				price: string;
				stock: number;
				id: number;
			};
	  }
	| {
			action: "add-barcode";
			data: {
				name: string;
				price: string;
				stock: number;
				id: number;
			};
	  };

export function itemReducer(state: State, action: Action): State {
	switch (action.action) {
		case "delete":
			return {...state, items: state.items.filter((_, i) => i !== action.index)};
		case "edit-name":
			return produce(state, (draft) => {
				draft.items[action.index].name = action.name;
			});
		case "edit-price": {
			const { index, price } = action;
			if (Number.isNaN(price) || Number(price) < 0 || Number(price) > 1e9) {
				return state;
			}
			return produce(state, (draft) => {
				draft.items[index].price = price;
			});
		}
		case "edit-qty": {
			const { index, qty } = action;
			if (
				Number.isNaN(qty) ||
				Number(qty) < 0 ||
				Number(qty) >= 10_000 ||
				(state.items[index].stock !== undefined && Number(qty) > state.items[index].stock)
			) {
				return state;
			}
			return produce(state, (draft) => {
				draft.items[index].qty = qty;
			});
		}
		case "edit-disc-val": {
			const { index, value } = action;
			if (
				Number.isNaN(value) ||
				Number(value) < 0 ||
				(state.items[index].disc.type === "number" && Number(value) >= 1e9) ||
				(state.items[index].disc.type === "percent" && Number(value) > 100)
			) {
				return state;
			}
			return produce(state, (draft) => {
				draft.items[index].disc.value = value;
			});
		}
		case "edit-disc-type": {
			const { index, type } = action;
			if (type !== "number" && type !== "percent") {
				return state;
			}
			let value = state.items[index].disc.value;
			if (type === "percent" && Number(value) > 100) {
				value = "100";
			}
			return produce(state, (draft) => {
				draft.items[index].disc.value = value;
				draft.items[index].disc.type = type;
			});
		}
		case "add-tax": {
			const { name, value } = action;
			return produce(state, (draft) => {
				draft.taxes.push({ name, value });
			});
		}
		case "delete-tax": {
			const { index } = action;
			return { ...state, taxes: state.taxes.filter((_, i) => i != index) };
		}
		case "add-manual": {
			const { disc, name, price, qty } = action.data;
			return produce(state, (draft) => {
				draft.items.push({
					name,
					price,
					qty,
					disc,
				});
			});
		}
		case "add-select": {
			const { id, name, price, stock } = action.data;
			if (stock === 0) {
				return state;
			}
			return produce(state, (draft) => {
				draft.items.push({
					name,
					price,
					qty: "1",
					disc: {
						value: "0",
						type: "number",
					},
					stock,
					id,
				});
			});
		}
		case "add-barcode": {
			const { id, name, price, stock } = action.data;
			return produce(state, (draft) => {
				draft.items.push({
					name,
					price,
					stock,
					id,
					qty: "1",
					disc: {
						value: "0",
						type: "number",
					},
				});
			});
		}
	}
}
