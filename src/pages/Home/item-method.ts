import { produce } from "immer";
import { Item } from "./Item";
import { createContext } from "react";

export const ItemContext = createContext<{
	items: Item[];
	setItems: React.Dispatch<React.SetStateAction<Item[]>>;
}>({ items: [], setItems: () => {} });
export const ItemContextProvider = ItemContext.Provider;

export const itemMethod = (setItems: React.Dispatch<React.SetStateAction<Item[]>>) => ({
	deleteItem: (index: number) => {
		setItems((prev) => prev.filter((_, i) => i !== index));
	},
	editName: (index: number, name: string) => {
		setItems((items) =>
			produce(items, (draft) => {
				draft[index].name = name;
			})
		);
	},
	editPrice: (index: number, price: string) => {
		if (Number.isNaN(price) || Number(price) < 0 || Number(price) > 1e9) {
			return;
		}
		setItems((items) =>
			produce(items, (draft) => {
				draft[index].price = price;
			})
		);
	},
	editQty: (index: number, qty: string) => {
		setItems((items) => {
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
		});
	},
	editDiscVal: (index: number, value: string) => {
		setItems((items) => {
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
		});
	},
	editDiscType: (index: number, type: string) => {
		setItems((items) => {
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
		});
	},
	addItemManual: ({
		name,
		price,
		qty,
		disc,
	}: {
		name: string;
		price: string;
		qty: string;
		disc: {
			type: "number" | "percent";
			value: string;
		};
	}) => {
		setItems((items) =>
			produce(items, (draft) => {
				draft.push({
					name,
					price,
					qty,
					disc,
				});
			})
		);
	},
});
