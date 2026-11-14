import { Effect } from "effect";
import { Channel, invoke } from "@tauri-apps/api/core";
import { InvokeError } from "./effect-error";
import { log } from "./log";

/**
 * The image optimizer, whose work happens in Rust (`src-tauri/src/image_opt.rs`).
 *
 * Two commands, and the split between them is the point: **plan** only reads and
 * hashes — it names what the job would do — and **run** is the only thing that
 * writes, converts or deletes. Opening the screen therefore costs a read, never a
 * change, and pressing the button is the only way anything happens.
 *
 * The row shapes below mirror the Rust structs field for field (`serde`
 * `rename_all = "camelCase"`), so a renamed field is a compile error here rather
 * than a silent `undefined`.
 */

/** Which phase the job is in: hashing (`scan`) or converting. */
export type ImageOptStage = "scan" | "convert";

export type ImageOptProgress = {
  stage: ImageOptStage;
  percent: number;
  done: number;
  total: number;
  /** Sum of the pictures as they were when the job met them. */
  bytesBefore: number;
  /** Sum of what those pictures are now. */
  bytesAfter: number;
};

/**
 * What the job would do, without doing it.
 *
 * The plan is a report, not a promise about bytes: only a conversion can say what
 * a conversion saves, so this counts the pictures and the run reports the
 * megabytes.
 */
export type ImageOptPlan = {
  total: number;
  /** Every live picture's bytes on disk now. */
  bytes: number;
  /** Pictures this policy will re-encode (PNG/JPEG → WebP). */
  convert: number;
  convertBytes: number;
  /** WebP pictures whose name is not yet their hash: renamed, never re-encoded. */
  rename: number;
  /** Already content-addressed: nothing to do. */
  optimal: number;
  /** Rows whose file is not on this device. Left alone, not an error. */
  missing: number;
  unreadable: number;
  /** Rows whose bytes another row already holds — the dedupe, counted early. */
  duplicates: number;
  duplicateBytes: number;
};

/** What a run did. */
export type ImageOptSummary = {
  converted: number;
  renamed: number;
  /** Old files unlinked once nothing named them. */
  reclaimed: number;
  optimal: number;
  missing: number;
  failed: number;
  bytesBefore: number;
  bytesAfter: number;
  cancelled: boolean;
};

const FAILED = "Gagal mengoptimalkan gambar. Coba lagi.";
const FAILED_PLAN = "Gagal membaca daftar gambar. Coba lagi.";

function failure(cause: unknown, message: string) {
  log.error(cause instanceof Error ? cause : new Error(String(cause)));
  // A command answers with its own sentence on failure (`Err(String)` in Rust).
  return new InvokeError({ message: typeof cause === "string" ? cause : message });
}

export function imageOptimizePlan(
  onProgress?: (progress: ImageOptProgress) => void,
): Effect.Effect<ImageOptPlan, InvokeError> {
  return Effect.tryPromise({
    try: () => {
      const channel = new Channel<ImageOptProgress>();
      channel.onmessage = (progress) => onProgress?.(progress);
      return invoke<ImageOptPlan>("image_optimize_plan", { onProgress: channel });
    },
    catch: (e) => failure(e, FAILED_PLAN),
  });
}

/**
 * Runs the job.
 *
 * The promise resolves when the run *ends*, which can be minutes for a large
 * catalogue: this is why it takes a progress channel, and why the screen must
 * offer a way out (`imageOptimizeCancel`).
 */
export function imageOptimizeRun(
  onProgress?: (progress: ImageOptProgress) => void,
): Effect.Effect<ImageOptSummary, InvokeError> {
  return Effect.tryPromise({
    try: () => {
      const channel = new Channel<ImageOptProgress>();
      channel.onmessage = (progress) => onProgress?.(progress);
      return invoke<ImageOptSummary>("image_optimize_run", { onProgress: channel });
    },
    catch: (e) => failure(e, FAILED),
  });
}

/**
 * Asks the running job to stop. It stops *between* pictures — a picture's
 * write-point-retire sequence is never cut in half — so the answer arrives in the
 * run's own `cancelled` flag, not here.
 */
export function imageOptimizeCancel(): Effect.Effect<void, InvokeError> {
  return Effect.tryPromise({
    try: () => invoke<void>("image_optimize_cancel"),
    catch: (e) => failure(e, FAILED),
  });
}
