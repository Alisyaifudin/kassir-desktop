import { BaseDirectory, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { Effect, Layer, Stream, SubscriptionRef } from "effect";
import { LogError, LogService } from ".";

const LOG_PATH = "logs/kassir.log";
const FILE = { baseDir: BaseDirectory.AppLocalData };

// The file is the source of truth and is written by the logger, not by this
// service, so there is no value to hold. A revision counter gives subscribers a
// re-read on subscribe and after every clear.
function readLines(): Effect.Effect<string[], LogError> {
  return Effect.tryPromise({
    try: () => readTextFile(LOG_PATH, FILE),
    catch: () => new LogError({ message: "Gagal membaca log" }),
  }).pipe(
    Effect.map((text) =>
      (text || "")
        .split("\n")
        .filter((line) => !line.includes("[WARN]"))
        .reverse(),
    ),
  );
}

export const LogLive = Layer.effect(
  LogService,
  Effect.gen(function* () {
    const revisionRef = yield* SubscriptionRef.make<number>(0);

    return {
      lines: {
        changes: revisionRef.changes.pipe(Stream.mapEffect(() => readLines())),
      },
      clear() {
        return Effect.tryPromise({
          try: () => writeTextFile(LOG_PATH, "", FILE),
          catch: () => new LogError({ message: "Gagal menghapus log" }),
        }).pipe(
          Effect.zipRight(SubscriptionRef.update(revisionRef, (current) => current + 1)),
          Effect.asVoid,
        );
      },
    };
  }),
);
