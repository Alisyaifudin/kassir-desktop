import { produce } from "immer";
import { create } from "zustand";

type Item = {
	barcode: number | null;
	name: string;
	price: number;
	qty: number;
	disc: {
		value: number;
		type: "number" | "percent";
	};
} & ({ id: number; stock: number } | { id: undefined; stock: undefined });

type Tax = {
	name: string;
	percent: number;
};

type Data = {
	mode: "sell" | "buy";
	sell: {
		items: Item[];
		taxes: Tax[];
	};
	buy: {
		items: Item[];
		taxes: Tax[];
	};
	cashier: string | null;
	pay: number;
	rounding: number;
	disc: {
		value: number;
		type: "number" | "percent";
	};
	method: "cash" | "transfer" | "emoney";
	note: string;
};

type DataState = Data & {
	reset: () => void;
	changeItem: {
		delete: (index: number) => void;
		editName: (mode: "sell" | "buy", index: number, name: string) => void;
		editBarcode: (mode: "sell" | "buy", index: number, barcode: number | null) => void;
		editPrice: (mode: "sell" | "buy", index: number, price: number) => void;
		editQty: (mode: "sell" | "buy", index: number, qty: number) => void;
		editDiscVal: (mode: "sell" | "buy", index: number, value: number) => void;
		editDiscType: (mode: "sell" | "buy", index: number, type: "percent" | "number") => void;
		add: (item: Item) => void;
	};
	changeTax: {
		delete: (index: number) => void;
		editName: (mode: "sell" | "buy", index: number, name: string) => void;
		editPercent: (mode: "sell" | "buy", index: number, percent: number) => void;
		add: (tax: Tax) => void;
	};
	changeCashier: (cashier: string) => void;
	changePay: (value: number) => void;
	changeRounding: (value: number) => void;
	changeDisc: {
		value: (value: number) => void;
		type: (value: "number" | "percent") => void;
	};
	changeMethod: (value: "cash" | "transfer" | "emoney") => void;
	changeNote: (value: string) => void;
};

export const initialValue: Data = {
	cashier: null,
	buy: {
		items: [],
		taxes: [],
	},
	sell: {
		items: [],
		taxes: [],
	},
	disc: {
		value: 0,
		type: "percent",
	},
	method: "cash",
	mode: "sell",
	note: "",
	pay: 0,
	rounding: 0,
};

export const useData = create<DataState>()((set) => ({
	...initialValue,
	changeCashier: (cashier) => set({ cashier }),
	changeDisc: {
		type: (value) => set((state) => ({ disc: { type: value, value: state.disc.value } })),
		value: (value) => set((state) => ({ disc: { type: state.disc.type, value } })),
	},
	changePay: (value) => set({ pay: value }),
	changeRounding: (value) => set({ rounding: value }),
	reset: () => set(initialValue),
	changeMethod: (value) => set({ method: value }),
	changeNote: (value) => set({ note: value }),
	changeTax: {
		add: (tax) => {
			set((state) =>
				produce(state, (draft) => {
					draft[state.mode].taxes.push(tax);
				})
			);
		},
		delete: (index) =>
			set((state) =>
				produce(state, (draft) => {
					draft[state.mode].taxes = draft[state.mode].taxes.filter((_, i) => i === index);
				})
			),
		editName: (mode, index, name) =>
			set((state) =>
				produce(state, (draft) => {
					draft[mode].taxes[index].name = name;
				})
			),
		editPercent: (mode, index, percent) =>
			set((state) =>
				produce(state, (draft) => {
					draft[mode].taxes[index].percent = percent;
				})
			),
	},
	changeItem: {
		add: (item) => {
			set((state) =>
				produce(state, (draft) => {
					draft[state.mode].items.push(item);
				})
			);
		},
		delete: (index) =>
			set((state) =>
				produce(state, (draft) => {
					draft[state.mode].items = draft[state.mode].items.filter((_, i) => i === index);
				})
			),
		editName: (mode, index, name) =>
			set((state) =>
				produce(state, (draft) => {
					draft[mode].items[index].name = name;
				})
			),
		editBarcode: (mode, index, barcode) =>
			set((state) =>
				produce(state, (draft) => {
					draft[mode].items[index].barcode = barcode;
				})
			),
		editPrice: (mode, index, price) =>
			set((state) =>
				produce(state, (draft) => {
					draft[mode].items[index].price = price;
				})
			),
		editQty(mode, index, qty) {
			set((state) =>
				produce(state, (draft) => {
					draft[mode].items[index].qty = qty;
				})
			);
		},
		editDiscType(mode, index, type) {
			set((state) =>
				produce(state, (draft) => {
					draft[mode].items[index].disc.type = type;
				})
			);
		},
		editDiscVal(mode, index, value) {
			set((state) =>
				produce(state, (draft) => {
					draft[mode].items[index].disc.value = value;
				})
			);
		},
	},
}));
