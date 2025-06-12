import { createContext, useContext } from "react";
import type { Additional, Item, ItemWithoutDisc } from "./schema";
import { Method } from "~/lib/utils";

const Context = createContext<null | {
	// item: ItemWithoutDisc | null;
	// additional: Additional | null;
	fix: number;
	setFix: (mode: "buy" | "sell", fix: number) => void;
	totalAfterDisc: number;
	totalAfterTax: number;
	totalBeforeDisc: number;
	totalTax: number;
	grandTotal: number;
	data: {
		note: string;
		pay: number;
		rounding: number;
		disc: {
			value: number;
			type: "number" | "percent";
		};
		method: "cash" | "transfer" | "debit" | "qris" | "other";
		methodType: number | null;
		items: Item[];
		additionals: Additional[];
	};
	set: {
		note: (mode: "buy" | "sell", note: string) => void;
		pay: (mode: "buy" | "sell", pay: number) => void;
		rounding: (mode: "buy" | "sell", rounding: number) => void;
		discVal: (mode: "buy" | "sell", value: number) => void;
		discType: (mode: "buy" | "sell", type: "number" | "percent") => void;
		method: (mode: "buy" | "sell", newMethod: Method) => void;
		methodType: (mode: "buy" | "sell", methodType: number | null) => void;
		items: {
			reset: (mode: "buy" | "sell") => void;
			add: (mode: "buy" | "sell", item: ItemWithoutDisc) => void;
			delete: (mode: "buy" | "sell", index: number) => void;
			name: (mode: "buy" | "sell", index: number, name: string) => void;
			barcode: (mode: "buy" | "sell", index: number, barcode: string | null) => void;
			price: (mode: "buy" | "sell", index: number, price: number) => void;
			qty: (mode: "buy" | "sell", index: number, qty: number) => void;
			disc: {
				delete: (mode: "buy" | "sell", itemIndex: number, index: number) => void;
				add: (mode: "buy" | "sell", itemIndex: number) => void;
				kind: (
					mode: "buy" | "sell",
					itemIndex: number,
					index: number,
					kind: "percent" | "number"
				) => void;
				value: (mode: "buy" | "sell", itemIndex: number, index: number, value: number) => void;
			};
		};
		additionals: {
			reset: (mode: "sell" | "buy") => void;
			add: (mode: "sell" | "buy", add: Additional) => void;
			delete: (mode: "sell" | "buy", index: number) => void;
			name: (mode: "sell" | "buy", index: number, name: string) => void;
			value: (mode: "sell" | "buy", index: number, value: number) => void;
			kind: (mode: "sell" | "buy", index: number, kind: "percent" | "number") => void;
		};
	};
}>(null);

export const Provider = Context.Provider;

// export function useItem() {
// 	const context = useContext(Context);
// 	if (context === null) {
// 		throw new Error("Outside the shop");
// 	}
// 	return { item: context.item, setItem: context.setItem };
// }

export function useLocalData() {
	const context = useContext(Context);
	if (context === null) {
		throw new Error("Outside the shop");
	}
	const { items, additionals, ...rest } = context.data;
	return { items, additionals, ...rest };
}

export function useSetData() {
	const context = useContext(Context);
	if (context === null) {
		throw new Error("Outside the shop");
	}
	const { items, additionals, ...rest } = context.set;
	return { items, additionals, ...rest };
}

// export function useAdditional() {
// 	const context = useContext(Context);
// 	if (context === null) {
// 		throw new Error("Outside the shop");
// 	}
// 	return { additional: context.additional, setAdditional: context.setAdditional };
// }

export function useFix() {
	const context = useContext(Context);
	if (context === null) {
		throw new Error("Outside the shop");
	}
	return { fix: context.fix, setFix: context.setFix };
}

export function useSummary() {
	const context = useContext(Context);
	if (context === null) {
		throw new Error("Outside the shop");
	}
	const { totalBeforeDisc, totalAfterDisc, totalTax, totalAfterTax, grandTotal } = context;
	return { totalBeforeDisc, totalAfterDisc, totalTax, totalAfterTax, grandTotal };
}
