import { z } from "zod";

const itemSchemaBase = z.object({
	barcode: z.string().nullable(),
	name: z.string(),
	price: z.number(),
	qty: z.number(),
	disc: z.object({
		value: z.number(),
		type: z.enum(["number", "percent"]),
	}),
});

export const itemSchema = z.union([
	itemSchemaBase.extend({
		id: z.number(),
		stock: z.number(),
	}),
	itemSchemaBase.extend({
		id: z.undefined(),
		stock: z.number().optional(),
	}),
]);

export type Item = z.infer<typeof itemSchema>;

export const otherSchema = z.object({
	name: z.string(),
	value: z.number(),
	kind: z.enum(["percent", "number"]),
});

export type Other = z.infer<typeof otherSchema>;

export const dataSchema = z.object({
	mode: z.enum(["sell", "buy"]),
	sell: z.object({
		items: itemSchema.array(),
		taxes: otherSchema.array(),
	}),
	buy: z.object({
		items: itemSchema.array(),
		taxes: otherSchema.array(),
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
