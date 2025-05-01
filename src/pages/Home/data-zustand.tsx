import { produce } from "immer";
import { create } from "zustand";
import { z } from "zod";

const itemSchemaBase = z.object({
	barcode: z.number().nullable(),
	name: z.string(),
	price: z.number(),
	qty: z.number(),
	disc: z.object({
		value: z.number(),
		type: z.enum(["number", "percent"]),
	}),
});

const itemSchema = z.union([
	itemSchemaBase.extend({
		id: z.number(),
		stock: z.number(),
	}),
	itemSchemaBase.extend({
		id: z.undefined(),
		stock: z.undefined(),
	}),
]);

export type Item = z.infer<typeof itemSchema>;

const taxSchema = z.object({ name: z.string(), percent: z.number() });

export type Tax = z.infer<typeof taxSchema>;

export const dataSchema = z.object({
	mode: z.enum(["sell", "buy"]),
	sell: z.object({
		items: itemSchema.array(),
		taxes: taxSchema.array(),
	}),
	buy: z.object({
		items: itemSchema.array(),
		taxes: taxSchema.array(),
	}),
	cashier: z.string().nullable(),
	pay: z.number(),
	rounding: z.number(),
	disc: z.object({
		value: z.number(),
		type: z.enum(["number", "percent"]),
	}),
	method: z.enum(["cash", "transfer", "emoney"]),
	note: z.string(),
});

export type Data = z.infer<typeof dataSchema>;

type DataState = Data & {
	reset: () => void;
	setInitial: (data: Data) => void;
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

// type u = Data & Pick<DataState, "setInitial">;

// export const useData = create<number>()((set) => 1);

export const useData = create<DataState>()((set) => ({
	...initialValue,
	setInitial(data) {
		set(data);
	},
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
