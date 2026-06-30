import { Effect } from "effect";
import { z } from "zod";
import { JsonError, TooBigError } from "~/lib/error-effect";

const schema = z.object({
  id: z.string().nonempty(),
  name: z.string().nonempty(),
  price: z.number(),
  note: z.string(),
  codes: z.string().array(),
  updatedAt: z.number().int(),
  capitals: z
    .object({
      id: z.string().nonempty(),
      stock: z.number().int(),
      capital: z.number(),
    })
    .array(),
});

const productsSchema = z.array(schema).min(1, { message: "Tidak boleh kosong" });

export type ProductImport = z.infer<typeof schema>;

export const MAXIMUM_SIZE = 10e6; // 10 mb

export function extractProduct(file: File) {
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

    const parsed = productsSchema.safeParse(json);
    if (!parsed.success) {
      console.error(parsed.error);
      return yield* JsonError.fail(
        `Format data tidak sah. Cek lagi:\n${z.treeifyError(parsed.error)}`,
      );
    }

    return parsed.data;
  });
}
