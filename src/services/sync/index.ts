import { Context, Data, Effect, Stream } from "effect";

/**
 * What only this device can see about a failed request.
 *
 * The server's own log row for the same request says it answered `200`; whether
 * the bytes survived the trip is not something it can observe. `requestId` is the
 * join key, `firstBytesHex` the observation.
 */
export type SyncEvidence = {
  /** The id Rust sent as `X-Kassir-Request-Id` for the failing request. */
  requestId: string;
  /** The route it failed on, as the server's log names it. */
  route: string;
  /** Leading bytes received, hex. `1f8b0800` is gzip where JSON belongs. */
  firstBytesHex: string | null;
  /** Length of the first line received. */
  bytes: number | null;
};

/**
 * A sync failure. `message` is the one sentence the Sinkronisasi screen renders;
 * `code` and `status` keep the protocol detail for the log and for the branches
 * in `push.ts`/`pull.ts` (retry vs. restart the upload session, §7.5).
 *
 * `stage` and `evidence` exist so the failure can be reported to the server
 * (`POST /v1/diagnostics`): the stage says where it died, the evidence says what
 * arrived. Without them a report is just the client repeating the message it
 * could not interpret.
 */
export class SyncError extends Data.TaggedError("SyncError")<{
  message: string;
  code?: string;
  status?: number;
  stage?: string;
  evidence?: SyncEvidence;
}> {}

/** A device's sync configuration — the server it talks to and its bearer token. */
export type SyncConfig = { baseUrl: string; token: string };

export const SYNC_CONFIG_DEFAULT: SyncConfig = { baseUrl: "", token: "" };

export type SyncStatus =
  /** Nothing running; the last outcome is in `report` / `error`. */
  | "idle"
  /** Clearing the cursors and the unsync markers before a `reset` run (§3.2). */
  | "preparing"
  /** Streaming server rows (§8). */
  | "pull"
  /** Writing the pull to SQLite (§5.2). */
  | "merge"
  /** Uploading local rows (§5.3). */
  | "push"
  /** A cancel was asked for and the run has not stopped yet. */
  | "cancelling"
  | "done"
  | "failed"
  | "cancelled";

/**
 * Everything the UI may know about the last or current run.
 *
 * One value, not four pieces of React state: a run is a background task, so its
 * "running" flag, its progress, its report and its error all outlive the screen
 * that started it, and they must never disagree with each other.
 */
export type SyncState = {
  status: SyncStatus;
  /** The entity currently moving, when a phase has one. */
  entity: string | null;
  /** Frames merged (pull) or acknowledged (push) in this phase. */
  done: number;
  /** Frames expected in this phase; 0 until known. */
  total: number;
  /** One plain sentence for the screen. */
  message: string;
  /** When the current (or last) run started, so a pill can count up. */
  startedAt: number | null;
  /** When it stopped; null while it is still going. */
  finishedAt: number | null;
  /** What the last run did, once it succeeded. */
  report: SyncReport | null;
  /** The sentence to show when the last run failed. */
  error: string | null;
};

/** The value a fresh subscription sees, and the state of an app that never synced. */
export const SYNC_IDLE: SyncState = {
  status: "idle",
  entity: null,
  done: 0,
  total: 0,
  message: "",
  startedAt: null,
  finishedAt: null,
  report: null,
  error: null,
};

const IN_FLIGHT: ReadonlySet<SyncStatus> = new Set<SyncStatus>([
  "preparing",
  "pull",
  "merge",
  "push",
  "cancelling",
]);

/** True while a run is in flight — what the status pill shows for. */
export function isRunning(state: SyncState): boolean {
  return IN_FLIGHT.has(state.status);
}

/** What `start` did: `already-running` is a refusal, not an error. */
export type SyncStart = "started" | "already-running";

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
      /**
       * This installation's id — the value the server records as `logs.device_id`
       * and the reason two tills sharing a token can be told apart.
       *
       * Minted on first read rather than only on first sync, so Settings can always
       * show one: reading an id off the screen is how a shop reports a problem
       * before anyone has managed to sync successfully.
       */
      deviceId: () => Effect.Effect<string>;
    };
    /** The last pull cursor, so a screen can show where the device stands. */
    cursor: () => Effect.Effect<number, SyncError>;
    /**
     * The loop itself — pull → merge → push (`sync`), or cursors and unsync
     * markers cleared first (`reset`, §3.2) — owned by the caller's fiber.
     *
     * The app does not call this: `start` forks it as a background task. It stays
     * public because the tests drive it directly and own the fiber.
     */
    run: (mode: SyncMode) => Effect.Effect<SyncReport, SyncError>;
    /**
     * Starts the loop as a background task. One run at a time: a second call while
     * a run is in flight is refused (`already-running`) instead of starting a
     * second pull/push pair over the same cursors and upload session.
     */
    start: (mode: SyncMode) => Effect.Effect<SyncStart>;
    /**
     * Asks the running loop to stop; a no-op when nothing runs.
     *
     * Cooperative by construction: the interrupt is delivered at the loop's next
     * async boundary, so an in-flight merge or upload settles first. The activity
     * is `cancelling` until it does.
     */
    cancel: () => Effect.Effect<void>;
    /**
     * The run's state, replayed to every new subscriber.
     *
     * A stream rather than a context: the pill and its dialog subscribe at their
     * own leaves, so a progress tick re-renders those two and nothing else.
     */
    state: Stream.Stream<SyncState>;
  }
>() {}
