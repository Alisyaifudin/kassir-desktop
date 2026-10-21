import { Effect } from "effect";
import { z } from "zod";
import { JsonError, TooBigError } from "~/lib/effect-error";
import { log } from "~/lib/log";
import type { ProductInput } from "~/services/product";
import { validateProductInput } from "~/services/product/validate-input";

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

    // The schema above checks the shape; these check the numbers, with the same
    // rules `product.add` enforces, so a file the dialog accepts is a file the
    // writer accepts — and the message names the row before "Impor" is pressed.
    for (const [index, product] of parsed.data.entries()) {
      const invalid = validateProductInput(product);
      if (invalid !== null) {
        log.error(invalid);
        return yield* Effect.fail(
          new JsonError(`Produk ke-${index + 1} (${product.name}): ${invalid}`),
        );
      }
    }

    return { products: parsed.data, name: file.name };
  });
}
