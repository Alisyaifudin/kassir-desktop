import { z } from "zod";
import { METHODS } from "~/lib/utils";

const itemSchemaBase = z.object({
	barcode: z.string().nullable(),
	name: z.string(),
	price: z.number(),
	qty: z.number(),
	capital: z.number().optional(),
});

export const itemWithoutDiscSchema = z.union([
	itemSchemaBase.extend({
		productId: z.number(),
		stock: z.number().int(),
	}),
	itemSchemaBase.extend({
		productId: z.undefined(),
		stock: z.number().int().optional(),
	}),
]);

export const discSchema = z
	.object({
		value: z.number(),
		kind: z.enum(["number", "percent"]),
	})
	.array();

export type Discount = z.infer<typeof discSchema>[number];

export const itemSchema = z.union([
	itemSchemaBase.extend({
		productId: z.number().int(),
		stock: z.number().int(),
		discs: discSchema,
	}),
	itemSchemaBase.extend({
		productId: z.undefined(),
		stock: z.number().int().optional(),
		discs: discSchema,
	}),
]);

export type Item = z.infer<typeof itemSchema>;
export type ItemWithoutDisc = z.infer<typeof itemWithoutDiscSchema>;

export const additionalSchema = z.object({
	name: z.string(),
	value: z.number(),
	kind: z.enum(["percent", "number"]),
});

export type Additional = z.infer<typeof additionalSchema>;

export const dataSchema = z.object({
	mode: z.enum(["sell", "buy"]),
	sell: z.object({
		items: itemSchema.array(),
		additionals: additionalSchema.array(),
	}),
	buy: z.object({
		items: itemSchema.array(),
		additionals: additionalSchema.array(),
	}),
	cashier: z.string().nullable(),
	pay: z.number(),
	rounding: z.number(),
	disc: z.object({
		value: z.number(),
		type: z.enum(["number", "percent"]),
	}),
	method: z.enum(METHODS),
	methodType: z.number().nullable(),
	note: z.string(),
});

export type Data = z.infer<typeof dataSchema>;

export const initialValue: Data = {
	cashier: null,
	buy: {
		items: [],
		additionals: [],
	},
	sell: {
		items: [],
		additionals: [],
	},
	disc: {
		value: 0,
		type: "percent",
	},
	method: "cash",
	methodType: null,
	mode: "sell",
	note: "",
	pay: 0,
	rounding: 0,
};

export type Record = {
	cashier: string;
	note: string;
	method: DB.Method;
	rounding: number;
	pay: number;
	discVal: number;
	discKind: DB.ValueKind;
};

const methodSchema = z.object({
	id: z.number().int(),
	name: z.string().nullable(),
	method: z.enum(["cash", "transfer", "debit", "qris"]),
});

export const stateSchema = z.object({
	pay: z.number(),
	rounding: z.number(),
	discKind: z.enum(["number", "percent"]),
	discVal: z.number(),
	note: z.string(),
	method: methodSchema,
	methods: methodSchema.array(),
	items: itemSchema.array(),
	additionals: additionalSchema.array(),
	fix: z.number().int(),
	customer: z
		.object({
			phone: z.string(),
			name: z.string(),
			isNew: z.boolean(),
		})
});

export type State = z.infer<typeof stateSchema>;
