import { Effect } from "effect";
import { invoke } from "@tauri-apps/api/core";
import { IOError } from "./effect-error";
import { log } from "./log";

/**
 * The whole-install backup, in the shape `export.ts` established: the dialog and
 * the write happen in Rust (`src-tauri/src/backup.rs`), because the fs plugin's
 * scope is narrowed to the app's own image and log directories — a frontend write
 * to a path the cashier picked is rejected as `PathForbidden` in a packaged
 * build. This side never names a path and never sees the raw plugin error.
 */

const FAILED = "Gagal membuat cadangan. Coba pilih folder lain.";

export type BackupSaved = {
  /** Where the archive was written, for the toast. */
  path: string;
  bytes: number;
};

/**
 * `store` is the loaded `store.json` as an object, not a file read: the plugin
 * writes on a debounce, so a read here could miss the preference the cashier just
 * changed. Passed through as JSON because Rust should not know the store's keys —
 * it only ships the bytes.
 *
 * The result is `null` when the cashier cancelled the save dialog. A caller must
 * be able to tell "wrote 4 MB to D:\\kassir-backup.zip" from "pressed Esc":
 * reporting success on `null` leaves the operator believing a backup exists.
 */
export function saveBackup(
  store: Record<string, unknown>,
): Effect.Effect<BackupSaved | null, IOError> {
  return Effect.tryPromise({
    try: () => invoke<BackupSaved | null>("backup_data", { storeJson: JSON.stringify(store) }),
    catch: (e) => {
      log.error(e instanceof Error ? e : String(e));
      return new IOError(e, FAILED);
    },
  });
}
