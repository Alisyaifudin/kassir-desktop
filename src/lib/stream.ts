import { Channel, invoke } from "@tauri-apps/api/core";
import { Stream, Effect, Sink } from "effect";
import { InvokeError } from "./effect-error";

export function streamFetch(
  url: string,
): Stream.Stream<Uint8Array, InvokeError, never> {
  return Stream.asyncPush<Uint8Array, InvokeError>((emit) =>
    Effect.sync(() => {
      const channel = new Channel<ArrayBuffer>();

      channel.onmessage = (chunk: ArrayBuffer) => {
        emit.single(new Uint8Array(chunk));
      };

      invoke("stream_fetch", { url, onChunk: channel })
        .then(() => emit.end())
        .catch((e) =>
          emit.fail(InvokeError.new(e, "Stream fetch failed")),
        );
    }),
  );
}

// ============================================================================
// Upload
// ============================================================================

/** Start an upload session. Returns a handle (UUID string). */
function uploadStart(url: string): Promise<string> {
  return invoke("upload_start", { url });
}

/** Send a chunk to an active upload session. */
function uploadChunk(
  handle: string,
  chunk: Uint8Array,
): Promise<void> {
  return invoke("upload_chunk", { handle, chunk });
}

/** End an upload session. Returns the server response as `"{status}: {body}"`.
 * Pass `abort: true` to skip awaiting the response so the server sees a
 * broken connection — signalling the upload was cancelled. */
function uploadEnd(handle: string, abort?: boolean): Promise<string> {
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
): Sink.Sink<string, Uint8Array, never, InvokeError> {
  return Sink.unwrapScoped(
    Effect.gen(function* () {
      const handle = yield* Effect.acquireRelease(
        Effect.tryPromise({
          try: () => uploadStart(url),
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
