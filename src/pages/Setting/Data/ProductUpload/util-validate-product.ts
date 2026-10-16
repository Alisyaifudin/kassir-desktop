import { Effect } from "effect";
import { z } from "zod";
import { JsonError, TooBigError } from "~/lib/effect-error";
import { log } from "~/lib/log";
import type { ProductInput } from "~/services/product";

const listingSchema = z.object({
  name: z.string().nonempty(),
  price: z.number(),
  unit: z.number().int().positive(),
  kind: z.string().nonempty(),
  code: z.string().nullable(),
  codeKind: z.enum(["barcode", "qr"]).nullable(),
});

const productSchema = z.object({
  name: z.string().nonempty(),
  note: z.string(),
  listings: z.array(listingSchema).min(1, { message: "Minimal satu listing" }),
  stocks: z
    .array(z.object({ value: z.number(), capital: z.number() }))
    .min(1, { message: "Minimal satu stok" }),
  properties: z.array(z.object({ key: z.string(), value: z.string() })),
});

const productsSchema: z.ZodType<ProductInput[]> = z
  .array(productSchema)
  .min(1, { message: "Tidak boleh kosong" });

/** One product in the file: the shape `product.add` takes. */
export type ProductImport = ProductInput;

export const MAXIMUM_SIZE = 10e6; // 10 mb

export function extractProduct(file: File) {
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

    const parsed = productsSchema.safeParse(json);
    if (!parsed.success) {
      log.error(parsed.error);
      return yield* Effect.fail(new JsonError("Format data tidak sah. Cek lagi."));
    }

    return { products: parsed.data, name: file.name };
  });
}
