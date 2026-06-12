import { Effect, Stream } from "effect";
import z from "zod";
import { HeaderError, TextDecoderError, ZodSchemaError } from "~/lib/effect-error";
import { streamFetch } from "~/lib/stream";
import { genURL } from "~/lib/url";
import { parseJson } from "~/lib/utils";

export function makeGet<TData extends z.ZodType, TDeleted extends z.ZodType>(config: {
  item: TData;
  deleted: TDeleted;
  path: (timestamp: number) => string;
}) {
  const schema = z.object({
    exist: config.item.array(),
    deleted: config.deleted,
    timestamp: z.number().min(0).max(1e16),
  });

  return function get(
    token: string,
    timestamp: number,
    onProgress: (currentSize: number, totalSize: number) => void,
  ) {
    return Effect.gen(function* () {
      const { size, chunks } = yield* streamFetch(genURL(config.path(timestamp)).href, {
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
  };
}
