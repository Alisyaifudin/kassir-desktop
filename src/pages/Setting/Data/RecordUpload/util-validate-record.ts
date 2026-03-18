import { Effect } from "effect";
import { z } from "zod";
import { JsonError, TooBigError } from "~/lib/effect-error";
import { log } from "~/lib/log";

const extraSchema = z.object({
  name: z.string(),
  value: z.number(),
  eff: z.number(),
  kind: z.enum(["percent", "number"]),
});
const discountSchema = z.object({
  value: z.number(),
  eff: z.number(),
  kind: z.enum(["percent", "number", "pcs"]),
});

const productSchema = z.object({
  name: z.string(),
  price: z.number(),
  qty: z.number().int(),
  capital: z.number(),
  capitalRaw: z.number(),
  total: z.number(),
  discounts: z.array(discountSchema),
});

const schema = z.object({
  products: z.array(productSchema),
  extras: z.array(extraSchema),
  paidAt: z.number().int(),
  rounding: z.number(),
  isCredit: z.boolean(),
  cashier: z.string(),
  mode: z.enum(["sell", "buy"]),
  pay: z.number(),
  note: z.string(),
  method: z.object({
    name: z.string().optional(),
    kind: z.enum(["cash", "transfer", "debit", "qris"]),
  }),
  fix: z.number().int(),
  customer: z.object({
    name: z.string(),
    phone: z.string(),
  }),
  subTotal: z.number(),
  total: z.number(),
});

const recordsSchema = z.array(schema).min(1, { message: "Tidak boleh kosong" });

export type RecordImport = z.infer<typeof schema>;

export const MAXIMUM_SIZE = 10e6; // 10 mb

export function extractRecord(file: File) {
  return Effect.gen(function* () {
    const isJsonFile = file.type === "application/json" || file.name.endsWith(".json");

    if (!isJsonFile) {
      return yield* Effect.fail(new JsonError("Format file tidak sah. Harus JSON."));
    }
    if (file.size > MAXIMUM_SIZE) {
      return yield* Effect.fail(new TooBigError(file.size));
    }

    const text = yield* Effect.tryPromise({
      try: () => file.text(),
      catch: (e) => new JsonError(e),
    });

    const json = yield* Effect.try({
      try: () => JSON.parse(text),
      catch: (e) => new JsonError(e),
    });

    const parsed = recordsSchema.safeParse(json);
    if (!parsed.success) {
      log.error(parsed.error);
      return yield* Effect.fail(new JsonError("Format data tidak sah. Cek lagi."));
    }

    return { records: parsed.data, name: file.name };
  });
}
