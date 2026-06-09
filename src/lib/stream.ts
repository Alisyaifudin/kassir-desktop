import { Channel, invoke } from "@tauri-apps/api/core";
import { Stream, Effect, Sink } from "effect";
import { InvokeError } from "./effect-error";

export function streamFetch(
  url: string,
  headers?: Record<string, string>,
): Effect.Effect<
  { size: number | null; chunks: Stream.Stream<Uint8Array, InvokeError> },
  InvokeError,
  never
> {
  return Effect.gen(function* () {
    const chunkChannel = new Channel<ArrayBuffer>();
    const metaChannel = new Channel<number | null>();

    // Capture the size from the meta channel before we proceed.
    // Rust always sends meta first — even on error responses — so
    // this promise resolves before any body chunks arrive.
    let resolveMeta: ((size: number | null) => void) | null = null;
    const metaPromise = new Promise<number | null>((resolve) => {
      resolveMeta = resolve;
    });
    metaChannel.onmessage = (size: number | null) => {
      resolveMeta?.(size);
    };

    const invokePromise = invoke("stream_fetch", {
      url,
      onChunk: chunkChannel,
      onMeta: metaChannel,
      headers,
    });

    const chunks = Stream.asyncPush<Uint8Array, InvokeError>((emit) =>
      Effect.sync(() => {
        chunkChannel.onmessage = (chunk: ArrayBuffer) => {
          emit.single(new Uint8Array(chunk));
        };

        invokePromise
          .then(() => emit.end())
          .catch((e) =>
            emit.fail(InvokeError.new(e, "Stream fetch failed")),
          );
      }),
    );

    // Wait for metadata. If invoke fails before meta is sent, the
    // stream will surface the error — but for network errors (no
    // response at all) meta never arrives. In that case invokePromise
    // rejects first and the chunks stream emits the error.
    const size = yield* Effect.promise(() => metaPromise);

    return { size, chunks };
  });
}

// ============================================================================
// Upload
// ============================================================================

export interface UploadResponse {
  status: number;
  body: string;
}

/** Start an upload session. Returns a handle (UUID string). */
function uploadStart(
  url: string,
  headers?: Record<string, string>,
): Promise<string> {
  return invoke("upload_start", { url, headers });
}

/** Send a chunk to an active upload session. */
function uploadChunk(
  handle: string,
  chunk: Uint8Array,
): Promise<void> {
  return invoke("upload_chunk", { handle, chunk });
}

/** End an upload session. Returns the server HTTP status and body.
 * Pass `abort: true` to skip awaiting the response so the server sees a
 * broken connection — signalling the upload was cancelled. */
function uploadEnd(handle: string, abort?: boolean): Promise<UploadResponse> {
  return invoke("upload_end", { handle, abort });
}

// ============================================================================
// Upload (Effect)
// ============================================================================

/**
 * Create a Sink that streams chunks to the server via the three-phase upload
 * protocol (start → chunk(s) → end).
 *
 * @example
 * ```ts
 * const result = yield* myChunkStream.pipe(
 *   Stream.run(streamUpload("https://server/upload"))
 * );
 * // result is the server response string, e.g. "200: {\"ok\":true}"
 * ```
 */
export function streamUpload(
  url: string,
  headers?: Record<string, string>,
): Sink.Sink<UploadResponse, Uint8Array, never, InvokeError> {
  return Sink.unwrapScoped(
    Effect.gen(function* () {
      const handle = yield* Effect.acquireRelease(
        Effect.tryPromise({
          try: () => uploadStart(url, headers),
          catch: (e) => InvokeError.new(e, "Upload start failed"),
        }),
        (h) =>
          // Always clean up the Rust session — even on error.
          // If the success path already called uploadEnd, this is a
          // harmless no-op (the Rust side returns "session not found").
          Effect.promise(() => uploadEnd(h, true)).pipe(
            Effect.catchAll(() => Effect.void),
          ),
      );

      return Sink.forEach(
        (chunk: Uint8Array) =>
          Effect.tryPromise({
            try: () => uploadChunk(handle, chunk),
            catch: (e) => InvokeError.new(e, "Upload chunk failed"),
          }),
      ).pipe(
        Sink.zipRight(
          Sink.fromEffect(
            Effect.tryPromise({
              try: () => uploadEnd(handle),
              catch: (e) => InvokeError.new(e, "Upload end failed"),
            }),
          ),
        ),
      );
    }),
  );
}
