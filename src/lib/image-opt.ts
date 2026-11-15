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

/**
 * Which phase the job is in: hashing (`scan`), converting, the folder sweep, or
 * the integrity pass.
 */
export type ImageOptStage = "scan" | "convert" | "sweep" | "verify";

export type ImageOptProgress = {
  stage: ImageOptStage;
  percent: number;
  done: number;
  total: number;
  /**
   * Sum of the pictures as they were when the job met them — the rows, not the
   * folder: what the sweep freed is reported separately (`orphanBytes`).
   */
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
  /**
   * Candidates this policy would re-encode (PNG/JPEG). A candidate is not a
   * promise: the encode is what says whether WebP came out smaller, and `store_in`
   * keeps the original when it did not — so `run` may report that same row as
   * renamed instead. Encoding every candidate here to find out would make the
   * read-only plan do the job's work.
   */
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
  /**
   * Files on disk that no live row names: what a failed retarget, a crash between
   * write and commit, or a delete path that never freed its file leaves behind.
   * The run unlinks them.
   */
  orphans: number;
  orphanBytes: number;
  /** `.part` scratch an interrupted write left behind. Never a picture's name. */
  parts: number;
  partBytes: number;
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
  /** Leftover files the sweep unlinked: orphans, and the bytes they held. */
  orphansReclaimed: number;
  orphanBytes: number;
  partsReclaimed: number;
  partBytes: number;
  /**
   * The rows' pictures, summed before and after. Not the folder: the sweep's bytes
   * are `orphanBytes` + `partBytes`, and adding the two lines together would be a
   * total nobody measured.
   */
  bytesBefore: number;
  bytesAfter: number;
  cancelled: boolean;
};

const FAILED = "Gagal mengoptimalkan gambar. Coba lagi.";
const FAILED_PLAN = "Gagal membaca daftar gambar. Coba lagi.";
const FAILED_VERIFY = "Gagal memeriksa gambar. Coba lagi.";

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

/**
 * What the integrity pass found and fixed.
 *
 * `checked` is every picture whose bytes were read; `repaired` is the subset whose
 * name claimed a digest the bytes did not have. `skipped` is a row the pass has
 * nothing to say about: a name the gallery minted makes no claim, and the normal
 * run is what content-addresses those.
 */
export type ImageOptVerify = {
  checked: number;
  repaired: number;
  /** Rows whose file is not on this device. Nothing to check. */
  missing: number;
  /** Rows whose name is not `<sha256>.<ext>` yet. */
  skipped: number;
  /**
   * Rows whose bytes do not decode as a picture. Reported, never repaired:
   * re-storing them would give the damage an honest name, and a peer would then
   * accept it as the real picture.
   */
  corrupt: number;
  failed: number;
  cancelled: boolean;
};

/**
 * Reads every live picture and repairs a name that no longer describes its bytes.
 *
 * The one thing the optimizer cannot notice on its own: a name is trusted as the
 * content, so a file whose bytes drifted is skipped forever, and a peer refuses the
 * download rather than re-deriving the name. This is the only pass that reads, and
 * the only one that can write a correct name back.
 */
export function imageOptimizeVerify(
  onProgress?: (progress: ImageOptProgress) => void,
): Effect.Effect<ImageOptVerify, InvokeError> {
  return Effect.tryPromise({
    try: () => {
      const channel = new Channel<ImageOptProgress>();
      channel.onmessage = (progress) => onProgress?.(progress);
      return invoke<ImageOptVerify>("image_optimize_verify", { onProgress: channel });
    },
    catch: (e) => failure(e, FAILED_VERIFY),
  });
}
