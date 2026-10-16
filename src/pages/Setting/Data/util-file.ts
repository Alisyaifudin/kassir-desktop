import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { Effect } from "effect";
import { IOError } from "~/lib/effect-error";

/**
 * Asks where to save, then writes `value` as pretty JSON. Cancelling the dialog
 * is not an error: nothing is written and the effect succeeds.
 */
export function saveJson(defaultPath: string, value: unknown): Effect.Effect<void, IOError> {
  return Effect.gen(function* () {
    const json = JSON.stringify(value, null, 2);
    const bytes = yield* Effect.tryPromise({
      try: () => new Blob([json], { type: "application/json" }).bytes(),
      catch: (e) => new IOError(e),
    });
    const filePath = yield* Effect.tryPromise({
      try: () =>
        save({
          title: "Simpan Data",
          defaultPath,
          filters: [{ name: "JSON", extensions: ["json"] }],
        }),
      catch: (e) => new IOError(e),
    });
    if (filePath === null) return;
    yield* Effect.tryPromise({
      try: () => writeFile(filePath, bytes),
      catch: (e) => new IOError(e),
    });
  });
}

/** The message to show for a service error or a file error alike. */
export function messageOf(error: { message: string } | IOError): string {
  return error instanceof IOError ? error.e.message : error.message;
}
