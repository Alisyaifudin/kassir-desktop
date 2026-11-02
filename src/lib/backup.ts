import { Effect } from "effect";
import { Channel, invoke } from "@tauri-apps/api/core";
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
 * Which step is running, and how far through the whole cycle it is.
 *
 * `stage` is a keyword; the Indonesian words for it live in the panel that draws
 * them (`BackupData.tsx`), the same split the sync phases use. `percent` covers the
 * cycle, not the step, so the bar fills once instead of restarting five times.
 */
export type BackupProgress = {
  stage: "snapshot" | "verify" | "hash" | "compress" | "finalize";
  percent: number;
};

/**
 * `store` is the loaded `store.json` as an object, not a file read: the plugin
 * writes on a debounce, so a read here could miss the preference the cashier just
 * changed. Passed through as JSON because Rust should not know the store's keys —
 * it only ships the bytes.
 *
 * `onProgress` is called as the Rust side works. It is deliberately fire-and-forget:
 * a dropped frame leaves the bar where it was, and no progress at all still leaves
 * a working backup.
 *
 * The result is `null` when the cashier cancelled the save dialog. A caller must
 * be able to tell "wrote 4 MB to D:\\kassir-backup.zip" from "pressed Esc":
 * reporting success on `null` leaves the operator believing a backup exists.
 */
export function saveBackup(
  store: Record<string, unknown>,
  onProgress?: (progress: BackupProgress) => void,
): Effect.Effect<BackupSaved | null, IOError> {
  return Effect.tryPromise({
    try: () => {
      const channel = new Channel<BackupProgress>();
      channel.onmessage = (progress) => onProgress?.(progress);
      return invoke<BackupSaved | null>("backup_data", {
        storeJson: JSON.stringify(store),
        onProgress: channel,
      });
    },
    catch: (e) => {
      log.error(e instanceof Error ? e : String(e));
      return new IOError(e, FAILED);
    },
  });
}
