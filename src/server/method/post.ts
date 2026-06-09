import { Effect, Stream } from "effect";
import z from "zod";
import { TextEncoderError } from "~/lib/effect-error";
import { streamUpload } from "~/lib/stream";
import { methodSchema } from "./get";
import { genURL } from "~/lib/url";
import { deletedSchema } from "../schema";

export function postMethodsToServer(
  token: string,
  payload: {
    exist: z.infer<typeof methodSchema>[];
    deleted: z.infer<typeof deletedSchema>[];
  },
  onProgress: (current: number, total: number) => void,
) {
  return Effect.gen(function* () {
    const encoder = new TextEncoder();
    const json = JSON.stringify(payload);
    const encoded = yield* Effect.try({
      try: () => encoder.encode(json),
      catch: (e) => TextEncoderError.new(e),
    });

    const total = encoded.byteLength;
    const CHUNK_SIZE = 64 * 1024;

    const chunks: Uint8Array[] = [];
    for (let offset = 0; offset < total; offset += CHUNK_SIZE) {
      chunks.push(encoded.slice(offset, offset + CHUNK_SIZE));
    }

    onProgress(0, total);
    let sent = 0;

    const response = yield* Stream.fromIterable(chunks).pipe(
      Stream.tap((chunk) =>
        Effect.sync(() => {
          sent += chunk.byteLength;
          onProgress(sent, total);
        }),
      ),
      Stream.run(
        streamUpload(genURL("/api/v2/method").href, {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        }),
      ),
    );

    return response;
  });
}
