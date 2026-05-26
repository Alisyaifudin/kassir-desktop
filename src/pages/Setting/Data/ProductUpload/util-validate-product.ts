import { Effect } from "effect";
import { z } from "zod";
import { JsonError, TooBigError } from "~/lib/effect-error";
import { log } from "~/lib/log";

const schema = z.object({
  id: z.string().nonempty(),
  price: z.number(),
  barcode: z.string().optional(),
  name: z.string().nonempty(),
  note: z.string(),
  stock: z.number().int(),
  capital: z.number(),
});

const productsSchema = z.array(schema).min(1, { message: "Tidak boleh kosong" });

export type ProductImport = z.infer<typeof schema>;

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
