import { Effect } from "effect";
import { z } from "zod";
import { InvalidShapeError, JsonError, TooBigError } from "~/lib/error-effect";
import { Record as RecordType } from "~/services/record/type";

const discountSchema = z.object({
  id: z.string(),
  value: z.number(),
  eff: z.number(),
  kind: z.enum(["percent", "number", "pcs"]),
});

const productSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
  qty: z.number().int(),
  capital: z.number(),
  total: z.number(),
  eventId: z.string().optional(),
  discounts: z.array(discountSchema),
});

const extraSchema = z.object({
  id: z.string(),
  name: z.string(),
  value: z.number(),
  eff: z.number(),
  kind: z.enum(["number", "percent"]),
});

const customerSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string(),
});

const methodSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  kind: z.enum(["cash", "transfer", "debit", "qris"]),
});

const schema = z.object({
  id: z.string(),
  createdAt: z.number().int(),
  paidAt: z.number().int(),
  rounding: z.number(),
  creditAt: z.number().int().optional(),
  cashier: z.string(),
  mode: z.enum(["in", "out"]),
  pay: z.number(),
  note: z.string(),
  fix: z.number().int(),
  subtotal: z.number(),
  total: z.number(),
  updatedAt: z.number().int(),
  method: methodSchema,
  customer: customerSchema.optional(),
  products: z.array(productSchema),
  extras: z.array(extraSchema),
});

export type RecordImport = z.infer<typeof schema>;

const recordsSchema = z.array(schema).min(1, { message: "Tidak boleh kosong" });

export const MAXIMUM_SIZE = 10e6; // 10 mb

export function extractRecord(file: File) {
  return Effect.gen(function* () {
    const isJsonFile = file.type === "application/json" || file.name.endsWith(".json");

    if (!isJsonFile) {
      return yield* JsonError.fail("Format file tidak sah. Harus JSON.");
    }

    if (file.size > MAXIMUM_SIZE) {
      return yield* TooBigError.fail(`File terlalu besar: ${file.size / 1000}KB`);
    }

    const text = yield* Effect.tryPromise({
      try: () => file.text(),
      catch: (e) => JsonError.new(e),
    });

    const json = yield* Effect.try({
      try: () => JSON.parse(text),
      catch: (e) => JsonError.new(e),
    });

    const parsed = recordsSchema.safeParse(json);
    if (!parsed.success) {
      return yield* InvalidShapeError.fail(
        `Format data tidak sah. Cek lagi:\n${z.treeifyError(parsed.error)}`,
      );
    }

    return parsed.data as RecordType[];
  });
}
