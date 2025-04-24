import { produce } from "immer";
import { Item } from "./Item";
import { createContext } from "react";

export const ItemContext = createContext<{
	items: State;
	dispatch: React.Dispatch<Action>;
}>({ items: [], dispatch: () => {} });
export const ItemContextProvider = ItemContext.Provider;

export type State = Item[];
export type Action =
	| { action: "delete"; index: number }
	| { action: "edit-name"; index: number; name: string }
	| { action: "edit-price"; index: number; price: string }
	| { action: "edit-qty"; index: number; qty: string }
	| { action: "edit-disc-val"; index: number; value: string }
	| { action: "edit-disc-type"; index: number; type: string }
	| { action: "edit-disc-type"; index: number; type: string }
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

export function itemReducer(items: State, action: Action): State {
	switch (action.action) {
		case "delete":
			return items.filter((_, i) => i !== action.index);
		case "edit-name":
			return produce(items, (draft) => {
				draft[action.index].name = action.name;
			});
		case "edit-price": {
			const { index, price } = action;
			if (Number.isNaN(price) || Number(price) < 0 || Number(price) > 1e9) {
				return items;
			}
			return produce(items, (draft) => {
				draft[index].price = price;
			});
		}
		case "edit-qty": {
			const { index, qty } = action;
			if (
				Number.isNaN(qty) ||
				Number(qty) < 0 ||
				Number(qty) >= 10_000 ||
				(items[index].stock !== undefined && Number(qty) > items[index].stock)
			) {
				return items;
			}
			return produce(items, (draft) => {
				draft[index].qty = qty;
			});
		}
		case "edit-disc-val": {
			const { index, value } = action;
			if (
				Number.isNaN(value) ||
				Number(value) < 0 ||
				(items[index].disc.type === "number" && Number(value) >= 1e9) ||
				(items[index].disc.type === "percent" && Number(value) > 100)
			) {
				return items;
			}
			return produce(items, (draft) => {
				draft[index].disc.value = value;
			});
		}
		case "edit-disc-type": {
			const { index, type } = action;
			if (type !== "number" && type !== "percent") {
				return items;
			}
			let value = items[index].disc.value;
			if (type === "percent" && Number(value) > 100) {
				value = "100";
			}
			return produce(items, (draft) => {
				draft[index].disc.value = value;
				draft[index].disc.type = type;
			});
		}
		case "add-manual": {
			const { disc, name, price, qty } = action.data;
			return produce(items, (draft) => {
				draft.push({
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
				return items;
			}
			return produce(items, (draft) => {
				draft.push({
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
			return produce(items, (draft) => {
				draft.push({
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
