import { Effect, Stream } from "effect";
import z from "zod";
import { HeaderError, TextDecoderError, ZodSchemaError } from "~/lib/effect-error";
import { streamFetch } from "~/lib/stream";
import { genURL } from "~/lib/url";
import { parseJson } from "~/lib/utils";
import { deletedSchema } from "../schema";

export const methodSchema = z.object({
  id: z.string().nonempty().max(100),
  name: z.string().max(100).nullable().optional(),
  kind: z.enum(["cash", "transfer", "debit", "qris"]),
  deletedAt: z.number().int().max(1e14).min(0).nullable().optional(),
  updatedAt: z.number().int().max(1e14).min(0).optional(),
});

export type MethodServer = z.infer<typeof methodSchema>;

const schema = z.object({
  exist: methodSchema.array(),
  deleted: deletedSchema.array(),
  timestamp: z.number().min(0).max(1e16),
});

export function getMethodsFromServer(
  token: string,
  timestamp: number,
  onProgress: (currentSize: number, totalSize: number) => void,
) {
  return Effect.gen(function* () {
    const { size, chunks } = yield* streamFetch(genURL(`/api/v2/method/${timestamp}`).href, {
      Authorization: `Bearer ${token}`,
    });
    if (size === null) return yield* HeaderError.fail("Tidak ada header 'Kassir-File-Size'");

    const joined = new Uint8Array(size);
    let offset = 0;

    yield* Stream.runForEach(chunks, (chunk) =>
      Effect.sync(() => {
        joined.set(chunk, offset);
        offset += chunk.byteLength;
        onProgress(offset, size);
      }),
    );

    const decoder = new TextDecoder();
    const str = yield* Effect.try({
      try: () => decoder.decode(joined),
      catch: (e) => TextDecoderError.new(e),
    });

    const json = yield* parseJson(str);
    const parsed = schema.safeParse(json);
    if (!parsed.success) return yield* ZodSchemaError.fail(parsed.error);
    return parsed.data;
  });
}
