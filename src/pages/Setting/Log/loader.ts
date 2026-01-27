import { BaseDirectory, readTextFile } from "@tauri-apps/plugin-fs";
import { Effect } from "effect";
import { ReadError } from "./effect-error";

export const LOG_PATH = "logs/kassir.log";

export function loader() {
  const text = readLog(LOG_PATH);
  return text;
}
function readLog(logPath: string) {
  return Effect.gen(function* () {
    const buffer = yield* Effect.tryPromise({
      try: () =>
        readTextFile(logPath, {
          baseDir: BaseDirectory.AppLocalData,
        }),
      catch: (e) => ReadError.new(e),
    });
    const text = buffer || "";
    return text.split("\n").reverse();
  });
}
