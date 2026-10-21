import { Effect } from "effect";
import { z } from "zod";
import { JsonError, TooBigError } from "~/lib/effect-error";
import { log } from "~/lib/log";
import type { RecordImport } from "~/services/record";

export type { RecordImport } from "~/services/record";

const discountSchema = z.object({
  kind: z.enum(["number", "percent", "pcs"]),
  value: z.number(),
  eff: z.number(),
});

const listingSchema = z.object({
  listingId: z.string().nullable(),
  name: z.string(),
  kind: z.string(),
  price: z.number(),
  qty: z.number().int(),
  capital: z.number(),
  total: z.number(),
  discounts: z.array(discountSchema),
});

const extraSchema = z.object({
  name: z.string(),
  value: z.number(),
  eff: z.number(),
  kind: z.enum(["number", "percent"]),
});

const recordSchema: z.ZodType<RecordImport> = z.object({
  paidAt: z.number().int(),
  rounding: z.number(),
  isCredit: z.boolean(),
  cashier: z.string(),
  mode: z.enum(["incoming", "outcoming"]),
  pay: z.number(),
  note: z.string(),
  fix: z.number().int(),
  customer: z.object({ name: z.string(), phone: z.string() }),
  supplier: z
    .object({ id: z.string().nullable(), name: z.string() })
    .optional(),
  subTotal: z.number(),
  total: z.number(),
  methods: z.array(z.object({ methodId: z.string().nonempty(), pay: z.number() })),
  listings: z.array(listingSchema),
  extras: z.array(extraSchema),
});

const recordsSchema: z.ZodType<RecordImport[]> = z
  .array(recordSchema)
  .min(1, { message: "Tidak boleh kosong" });

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
