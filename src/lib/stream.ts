import { Channel, invoke } from "@tauri-apps/api/core";
import { Stream, Effect } from "effect";
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
