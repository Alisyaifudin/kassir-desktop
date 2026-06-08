import { Effect, Stream } from "effect";
import z from "zod";
import { TextEncoderError } from "~/lib/effect-error";
import { streamUpload } from "~/lib/stream";
import { customerSchema } from "./get";
import { genURL } from "~/lib/url";

export function postCustomersToServer(
  token: string,
  customers: z.infer<typeof customerSchema>[],
  onProgress: (current: number, total: number) => void,
) {
  return Effect.gen(function* () {
    const encoder = new TextEncoder();
    const json = JSON.stringify(customers);
    const encoded = yield* Effect.try({
      try: () => encoder.encode(json),
      catch: (e) => TextEncoderError.new(e),
    });

    const total = encoded.byteLength;
    const CHUNK_SIZE = 64 * 1024;

    // Build chunk array upfront so the stream types are trivial
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
        streamUpload(genURL("/api/v2/customer").href, {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        }),
      ),
    );

    return response;
  });
}
