import { z } from "zod";

const discountSchema = z.object({
	value: z.number(),
	kind: z.enum(["percent", "number", "pcs"]),
});

const itemSchema = z.object({
	barcode: z.string().nullable(),
	name: z.string(),
	price: z.number(),
	qty: z.number().int(),
	stock: z.number().int(),
	id: z.number().int().optional(),
	discounts: discountSchema.array(),
	og: z
		.object({
			barcode: z.string().nullable(),
			name: z.string(),
			price: z.number(),
		})
		.optional(),
});

export type Discount = z.infer<typeof discountSchema>;

export type Item = z.infer<typeof itemSchema>;
export type ItemBase = z.infer<typeof itemSchema>;

const additionalSchema = z.object({
	name: z.string(),
	value: z.number(),
	kind: z.enum(["percent", "number"]),
	saved: z.boolean(),
});

export type Additional = z.infer<typeof additionalSchema>;

export const stateSchema = z.object({
	fix: z.number().int(),
	methodId: z.number().int(),
	note: z.string(),
	pay: z.number(),
	rounding: z.number(),
	mode: z.enum(["buy", "sell"]),
	customer: z.object({
		phone: z.string(),
		name: z.string(),
		isNew: z.boolean(),
	}),
	items: itemSchema.array(),
	additionals: additionalSchema.array(),
	itemManual: z.object({
		barcode: z.string(),
		name: z.string(),
		price: z.number(),
		qty: z.number().int(),
		stock: z.number().int(),
	}),
	additionalManual: z.object({
		name: z.string(),
		value: z.number(),
		kind: z.enum(["percent", "number"]),
		saved: z.boolean(),
	}),
});

export type State = z.infer<typeof stateSchema>;
