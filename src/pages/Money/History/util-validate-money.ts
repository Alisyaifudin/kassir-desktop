import { Effect } from "effect";
import { z } from "zod";
import { JsonError, TooBigError } from "~/lib/error-effect";

const schema = z.object({
  timestamp: z.number().int(),
  note: z.string(),
  value: z.number(),
});

const moneySchema = z.array(schema).min(1, { message: "Tidak boleh kosong" });

export type MoneyImport = z.infer<typeof schema>;

export const MAXIMUM_SIZE = 10e6; // 10 mb

export function extractMoney(file: File) {
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

    const parsed = moneySchema.safeParse(json);
    if (!parsed.success) {
      console.error(parsed.error);
      return yield* JsonError.fail(
        `Format data tidak sah. Cek lagi:\n${z.treeifyError(parsed.error)}`,
      );
    }

    return { money: parsed.data, name: file.name };
  });
}
