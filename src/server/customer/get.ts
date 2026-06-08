import { Effect, Stream } from "effect";
import z from "zod";
import { HeaderError, TextDecoderError, ZodSchemaError } from "~/lib/effect-error";
import { streamFetch } from "~/lib/stream";
import { parseJson } from "~/lib/utils";

export const customerSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string(),
  updatedAt: z.number(),
  deletedAt: z.number().optional(),
});

export function getCustomersFromServer(token: string, onProgress: (currentSize: number, totalSize: number) => void) {
  return Effect.gen(function* () {
    const { size, chunks } = yield* streamFetch("/api/v2/customer", {
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
    const parsed = customerSchema.array().safeParse(json);
    if (!parsed.success) return yield* ZodSchemaError.fail(parsed.error);
    return parsed.data;
  });
}
