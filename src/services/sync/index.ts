import { Context, Data, Effect, Stream } from "effect";

/**
 * A sync failure. `message` is the one sentence the Sinkronisasi screen renders;
 * `code` and `status` keep the protocol detail for the log and for the branches
 * in `push.ts`/`pull.ts` (retry vs. restart the upload session, §7.5).
 */
export class SyncError extends Data.TaggedError("SyncError")<{
  message: string;
  code?: string;
  status?: number;
}> {}

/** A device's sync configuration — the server it talks to and its bearer token. */
export type SyncConfig = { baseUrl: string; token: string };

export const SYNC_CONFIG_DEFAULT: SyncConfig = { baseUrl: "", token: "" };

export type SyncPhase =
  /** Nothing running; the last outcome is in `lastRun`. */
  | "idle"
  /** Streaming server rows (§8). */
  | "pull"
  /** Writing the whole pull to SQLite in one batch (§5.2). */
  | "merge"
  /** Uploading local rows (§5.3). */
  | "push"
  | "done"
  | "failed"
  | "cancelled";

export type SyncProgress = {
  phase: SyncPhase;
  /** The entity currently moving, when a phase has one. */
  entity: string | null;
  /** Frames merged (pull) or acknowledged (push) in this phase. */
  done: number;
  /** Frames expected in this phase; 0 until known. */
  total: number;
  /** One plain sentence for the screen. */
  message: string;
};

export type SyncReport = {
  /** Highest `sync_seq` merged locally. */
  lastPulledSeq: number;
  /** Frames merged from the server. */
  pulled: number;
  /** Frames the server acknowledged while pushing. */
  pushed: number;
  /** Rows the server won on a last-writer-wins tie and the device took back. */
  stale: number;
};

export type SyncMode = "sync" | "reset";

export class SyncService extends Context.Tag("SyncService")<
  SyncService,
  {
    config: {
      get: () => Effect.Effect<SyncConfig, SyncError>;
      set: (config: SyncConfig) => Effect.Effect<void, SyncError>;
    };
    /** The last pull cursor, so a screen can show where the device stands. */
    cursor: () => Effect.Effect<number, SyncError>;
    /** `sync` runs pull → merge → push; `reset` clears the cursors and the
     * upload session and marks every syncable row for re-push first (§3.2). */
    run: (mode: SyncMode) => Effect.Effect<SyncReport, SyncError>;
    /** Interrupts the running fiber's in-flight request. */
    cancel: () => Effect.Effect<void>;
    progress: Stream.Stream<SyncProgress, SyncError>;
  }
>() {}
