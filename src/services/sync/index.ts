import { Context, Data, Effect, Stream } from "effect";

/**
 * A sync failure. `message` is the one sentence the Sinkronisasi screen renders;
 * `code` and `status` keep the protocol detail for the log and for the branches
 * in `pull.ts`/`push.ts` (retry vs. restart, §6.6/§7.6).
 */
export class SyncError extends Data.TaggedError("SyncError")<{
  message: string;
  code?: string;
  status?: number;
}> {}

/**
 * The address a fresh install starts with.
 *
 * The backend is an operator setting (Settings → Sinkronisasi), not a
 * compiled-in constant: a shop running its own worker — staging, a self-hosted
 * deployment — points the till at it without waiting for a rebuild. This is
 * only the value the field is seeded with.
 */
export const SYNC_DEFAULT_BASE_URL = "https://api.kassir.store";

/** A device's sync configuration — the server it talks to and its bearer token. */
export type SyncConfig = { baseUrl: string; token: string };

export const SYNC_CONFIG_DEFAULT: SyncConfig = {
  baseUrl: SYNC_DEFAULT_BASE_URL,
  token: "",
};

/**
 * What a health check (`GET /v2/health`) learned.
 *
 * Only a *successful* check becomes one of these: a non-2xx answer or a failed
 * connection is a `SyncError`, so the screen never has to interpret a status
 * that is already an error.
 */
export type SyncHealth = {
  /** The HTTP status the server answered with (2xx). */
  status: number;
  /** The response body, collapsed to one bounded line — the server's own words. */
  message: string;
};

/**
 * One synced group of tables.
 *
 * The protocol is grouped, and every group has its own endpoint pair, its own
 * column dictionaries and — crucially — its own **bookmark**: a group is an
 * independent stream of `seq` values, so `money` can be at seq 40 while
 * `catalogue` is at seq 900. Today there is exactly one group (§1 of
 * `SYNC-V2-MONEY.md`); a second one is a new entry here plus its own
 * `syncGroup` case, not a change to the money flow.
 */
export type SyncGroup = "money";

/** Every group this build syncs, in the order the cycle visits them. */
export const SYNC_GROUPS: readonly SyncGroup[] = ["money"];

/** A group's phase inside a run. */
export type GroupPhase =
  /** Not started yet in this run. */
  | "idle"
  /** Streaming server changes into the page buffer (§6.4). */
  | "pull"
  /** Writing the page and the bookmark (§6.4 "one transaction per page"). */
  | "merge"
  /** Uploading the rows this device owes the server (§7.4). */
  | "push"
  | "done"
  | "failed"
  | "cancelled";

/**
 * One group's progress — what a progress bar renders.
 *
 * Per group, not per run: the end state of this screen is one bar per synced
 * group, each with its own phase and outcome, so a group that is finished keeps
 * saying so while the next one runs.
 *
 * `progress` is **one fraction for the whole cycle**, not one per phase: a bar
 * that resets at every pull → merge → push boundary runs backwards four times a
 * run and reads as an error, not as progress. The phases are weighted into the
 * single fraction (and never allowed to decrease), so the bar only ever moves
 * forward while the caption says what is happening.
 */
export type GroupState = {
  group: SyncGroup;
  phase: GroupPhase;
  /** 0…1 across the whole cycle; `null` until the first page sizes the work. */
  progress: number | null;
  /** One plain sentence for the bar. */
  message: string;
  /** What this group did in the last run, once it succeeded. */
  report: GroupReport | null;
  /** The sentence to show when this group failed. */
  error: string | null;
};

/** What one group's cycle did. */
export type GroupReport = {
  /** This group's bookmark after the run. */
  bookmark: number;
  /** Changes merged from the server. */
  pulled: number;
  /** Frames the server acknowledged while pushing. */
  pushed: number;
  /** Frames the server won and this device took back. */
  stale: number;
};

/** The run's phase — the pill's state, above the per-group phases. */
export type SyncStatus =
  /** Nothing running; the last outcome is in `report` / `error`. */
  | "idle"
  /** Clearing bookmarks and sync markers before a `reset` run. */
  | "preparing"
  /** At least one group is moving. */
  | "running"
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
  /** Every group in `SYNC_GROUPS` order — one progress bar each. */
  groups: GroupState[];
  /** One plain sentence for the run as a whole. */
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

/** The state of a group that has not started, and of an app that never synced. */
export function idleGroup(group: SyncGroup): GroupState {
  return { group, phase: "idle", progress: null, message: "", report: null, error: null };
}

function idleGroups(): GroupState[] {
  return SYNC_GROUPS.map(idleGroup);
}

/** The value a fresh subscription sees, and the state of an app that never synced. */
export const SYNC_IDLE: SyncState = {
  status: "idle",
  groups: idleGroups(),
  message: "",
  startedAt: null,
  finishedAt: null,
  report: null,
  error: null,
};

const IN_FLIGHT: ReadonlySet<SyncStatus> = new Set<SyncStatus>([
  "preparing",
  "running",
  "cancelling",
]);

/** True while a run is in flight — what the status pill shows for. */
export function isRunning(state: SyncState): boolean {
  return IN_FLIGHT.has(state.status);
}

/** What `start` did: `already-running` is a refusal, not an error. */
export type SyncStart = "started" | "already-running";

export type SyncReport = {
  /** Each group's outcome, so a bar can report its own numbers afterwards. */
  groups: Record<SyncGroup, GroupReport>;
  /** Totals across groups, for the one-line summary. */
  pulled: number;
  pushed: number;
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
       * This installation's id — the value the server records as
       * `logs.device_id` and the reason two tills sharing a token can be told
       * apart.
       *
       * Minted on first read rather than only on first sync, so Settings can
       * always show one: reading an id off the screen is how a shop reports a
       * problem before anyone has managed to sync successfully.
       */
      deviceId: () => Effect.Effect<string>;
    };
    /**
     * Pings `GET /v2/health` at `config.baseUrl` with `config.token` — what the
     * Cek button asks.
     *
     * The config is an argument rather than the stored value: the point is to
     * verify what is in the fields *before* it is saved, so an operator can
     * catch a typo in either half without writing it to disk first.
     */
    check: (config: SyncConfig) => Effect.Effect<SyncHealth, SyncError>;
    /**
     * One group's bookmark: the highest `seq` this device has durably stored for
     * it (§2.2). One integer per group — never one per table.
     */
    cursor: (group?: SyncGroup) => Effect.Effect<number, SyncError>;
    /**
     * The loop itself — pull → merge → push → pull (`sync`), or with the
     * bookmark cleared and every row queued for push first (`reset`, §11.4).
     *
     * The app does not call this: `start` forks it as a background task. It stays
     * public because the tests drive it directly and own the fiber.
     */
    run: (mode: SyncMode) => Effect.Effect<SyncReport, SyncError>;
    /**
     * Starts the loop as a background task. One run at a time: a second call
     * while a run is in flight is refused (`already-running`) instead of starting
     * a second pull/push pair over the same bookmark.
     */
    start: (mode: SyncMode) => Effect.Effect<SyncStart>;
    /**
     * Asks the running loop to stop; a no-op when nothing runs.
     *
     * Cooperative by construction: the interrupt is delivered at the loop's next
     * async boundary, so an in-flight request or merge settles first.
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
