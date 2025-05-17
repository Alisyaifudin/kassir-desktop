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
		id: z.number(),
		stock: z.number(),
	}),
	itemSchemaBase.extend({
		id: z.undefined(),
		stock: z.number().optional(),
	}),
]);

export const discSchema = z
	.object({
		value: z.number(),
		type: z.enum(["number", "percent"]),
	})
	.array();

export type Discount = z.infer<typeof discSchema>[number];

export const itemSchema = z.union([
	itemSchemaBase.extend({
		id: z.number(),
		stock: z.number(),
		discs: discSchema,
	}),
	itemSchemaBase.extend({
		id: z.undefined(),
		stock: z.number().optional(),
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
