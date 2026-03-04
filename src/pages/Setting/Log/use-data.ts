import { BaseDirectory, readTextFile } from "@tauri-apps/plugin-fs";
import { Effect } from "effect";
import { ReadError } from "./util-effect-error";
import { Result } from "~/lib/result";

export const LOG_PATH = "logs/kassir.log";

export function useData() {
  const res = Result.use({
    fn: () => readLog(LOG_PATH),
    key: LOG_PATH,
  });
  return res;
}

export function revalidate() {
  Result.revalidate(LOG_PATH);
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
    return text
      .split("\n")
      .filter((s) => !s.includes("[WARN]"))
      .reverse();
  });
}
