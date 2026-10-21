import { Effect } from "effect";
import { invoke } from "@tauri-apps/api/core";
import { IOError } from "./effect-error";
import { log } from "./log";

/**
 * The one "serialise → ask where → write" program in the app.
 *
 * The dialog and the write happen in Rust (`src-tauri/src/export.rs`): the fs
 * plugin's scope is narrowed to the app's own image and log directories, so a
 * frontend `writeFile` on a user-picked path is rejected as `PathForbidden`.
 * This side never names a path and never sees the raw plugin error.
 */

const FAILED = "Gagal menyimpan file. Coba pilih folder lain.";

/** `\ / : * ? " < > |` are not allowed in a Windows file name. */
export function fileNameOf(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "-");
}

/**
 * The written path, or `null` when the cashier cancelled the save dialog. A
 * caller must be able to tell "wrote 412 products to D:\\backup.json" from "pressed
 * Esc": reporting success on `null` leaves the operator hunting for a file that
 * was never written.
 */
export function saveJson(defaultName: string, value: unknown): Effect.Effect<string | null, IOError> {
  return Effect.gen(function* () {
    const contents = JSON.stringify(value, null, 2);
    return yield* Effect.tryPromise({
      try: () =>
        invoke<string | null>("export_file", {
          defaultName: fileNameOf(defaultName),
          contents,
        }),
      catch: (e) => {
        log.error(e instanceof Error ? e : String(e));
        return new IOError(e, FAILED);
      },
    });
  });
}
