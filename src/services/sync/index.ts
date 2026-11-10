import { Context, Data, Effect, Stream } from "effect";
import type { OneProductReport } from "./one-product";
import { SYNC_GROUPS, type SyncGroup } from "./schema";

export type { OneProductReport } from "./one-product";

export { SYNC_GROUPS };
export type { SyncGroup };

/**
 * A sync failure. `message` is the one sentence the Sinkronisasi screen renders;
 * `code` and `status` keep the protocol detail for the log and for the branches
 * in `pull.ts`/`push.ts` (retry vs. re-seed, §4.11/§9.8). `floor` is present only
 * on a `410 too_old`, and is the lowest seq the server still serves.
 */
export class SyncError extends Data.TaggedError("SyncError")<{
  message: string;
  code?: string;
  status?: number;
  floor?: number;
}> {}

/**
 * The address a fresh install starts with.
 *
 * The backend is an operator setting (Settings → Sinkronisasi), not a
 * compiled-in constant: a shop running its own worker — staging, a self-hosted
 * deployment — points the till at it without waiting for a rebuild. This is
 * only the value the field is seeded with.
 */
export const SYNC_DEFAULT_BASE_URL = "https://api.kassir.store/api";

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
 * `product` is at seq 900. The catalog of groups lives in `schema.ts`; this file
 * re-exports it so callers have one import.
 */

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
  /**
   * The closing pull: reading past this device's own push to see whether another
   * till wrote anything while it ran (§9.2 "pull → push → pull").
   *
   * Its own phase rather than a second `pull` because it is not the same act: by
   * then this device has already sent everything, and a bar reading 100% next to
   * the word "downloading" is a screen implying work it is not doing.
   */
  | "settle"
  | "done"
  | "failed"
  | "cancelled";

/** One direction of a group's transfer — the byte counter under its bar. */
export type TransferSide = {
  /**
   * Bytes of work this group did: the framed lines it stored, plus the file bytes
   * it sent or received.
   *
   * The closing pull's own upload does not count. Those bytes did cross the wire,
   * but the device already had every row in them — counting them would make the
   * counter climb through a phase that is changing nothing.
   */
  bytes: number;
  /**
   * Where the pass that is running will end, or `null` when nothing is left to
   * size.
   *
   * Only ever a *known* figure: a file pass is told every size by the manifest (or
   * by the files on disk) before it moves one, so `total - bytes` is the work left
   * in it. A row pass has no byte total to offer — a page states how many changes
   * it holds, not how big they are — and says so with `null` rather than projecting
   * one from the average of the rows that arrived so far. That projection rose as
   * bigger rows turned up and could never be corrected down, which is exactly a
   * denominator that grows the longer the sync runs.
   *
   * A `~` on screen: even an exact per-pass figure is not a total for the whole
   * group, because the next pass will add to it.
   */
  total: number | null;
};

/**
 * Bytes moved by one group, both directions.
 *
 * A separate channel from the fraction: the bar says *how far*, this says *how
 * much*. They are not the same question — a hundred small rows and one photo can
 * be the same percentage and a very different amount of waiting.
 */
export type GroupTransfer = { down: TransferSide; up: TransferSide };

/** Zeroed counters, for a group that has not moved a byte yet. */
export function idleTransfer(): GroupTransfer {
  return { down: { bytes: 0, total: null }, up: { bytes: 0, total: null } };
}

/**
 * One group's progress — what a progress bar renders.
 *
 * Per group, not per run: the end state of this screen is one bar per synced
 * group, each with its own phase and outcome, so a group that is finished keeps
 * saying so while the next one runs.
 *
 * `progress` is **one fraction for the whole cycle**, not one per phase: a bar
 * that resets at every pull → merge → push boundary runs backwards four times a
 * run and reads as an error, not as progress. The phases are weighted by the work
 * each one actually owes (see `PLAN_UNITS` in `live.ts`), so the bar only ever
 * moves forward while the caption says what is happening.
 */
export type GroupState = {
  group: SyncGroup;
  phase: GroupPhase;
  /** 0…1 across the whole cycle; `null` until the first page sizes the work. */
  progress: number | null;
  /** One plain sentence for the bar. */
  message: string;
  /** Bytes moved so far, and what the pass expects in total. */
  transfer: GroupTransfer;
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
  /**
   * Rows/records this group still owes after the cycle.
   *
   * Normally `0`: a push ends when nothing is left to send. It is non-zero only
   * when the push hit its runaway guard or the server acked fewer frames than it
   * received, and the screen says so rather than showing a finished run over a
   * half-uploaded catalogue.
   */
  remaining: number;
  /** Frames the server won and this device took back. */
  stale: number;
  /** Money rows still waiting for a pocket that has not arrived (§7.5). */
  pending: number;
  /**
   * Live rows hidden behind a soft-deleted parent: a money row whose pocket is
   * deleted, a product child whose product is (§6.6, §15.13). Kept and counted,
   * never deleted; surfaced so they are not invisible.
   */
  orphans: number;
  /**
   * Image files this device sent to the server in this run (§8.7.1). Only the
   * `product` group moves bytes, so every other group reports `0`.
   */
  imagesUp: number;
  /**
   * Image files this device received from the server in this run.
   *
   * Bytes are a second channel with no bookmark: they travel after the rows, never
   * before, and never delay one — a picture still missing is a placeholder, not a
   * failed sync.
   */
  imagesDown: number;
  /**
   * Image files still owed to the server when the cycle ended.
   *
   * Normally `0`: the upload drains until nothing is owed. Non-zero only when the
   * drain stopped because a pass resolved nothing — a row the server refuses, a
   * file this device does not have — and the screen must not say "Selesai" over a
   * half-uploaded gallery.
   */
  imagesOwed: number;
};

/**
 * One line in the run's detail log.
 *
 * Structured, not a finished sentence: the service knows *what* crossed and the
 * row's own name, while the wording (`Mengunduh`, `stok keluar`, the entity's
 * noun) belongs to the screen — the same split `PHASE_LABEL` and `GROUP_LABEL`
 * already use for the bar's captions.
 *
 * The union is discriminated by `kind` so a renderer cannot read a field the
 * event does not carry: a `delete` has no `label` because a `del` frame names
 * only an id, and pretending otherwise would print an empty name.
 */
export type SyncLogEntry =
  /** One row arrived in a pull and was committed with its page. */
  | { kind: "pull"; at: number; group: SyncGroup; entity: string; label: string | null }
  /** One tombstone arrived; the frame carries an id and nothing else. */
  | { kind: "delete"; at: number; group: SyncGroup; entity: string }
  /** One frame this device owed the server came back acknowledged. */
  | {
      kind: "push";
      at: number;
      group: SyncGroup;
      entity: string;
      label: string | null;
      ack: "applied" | "noop" | "stale";
    }
  /** One image file finished its turn in a pass. */
  | {
      kind: "image";
      at: number;
      group: SyncGroup;
      direction: "down" | "up";
      name: string | null;
      done: number;
      total: number;
      /**
       * What happened to it: `ok` moved bytes, `skipped` was deliberately left
       * alone (the server holds other bytes, the local file is gone, the row is
       * tombstoned), `failed` will be retried.
       */
      outcome: "ok" | "skipped" | "failed";
    }
  /** One page's merge outcomes, counted rather than listed. */
  | {
      kind: "merge";
      at: number;
      group: SyncGroup;
      applied: number;
      noop: number;
      stale: number;
      parked: number;
    }
  /** A boundary or an outcome the counts cannot say (§ `SyncLogNote`). */
  | { kind: "note"; at: number; group: SyncGroup | null; text: string; level: "info" | "error" };

/**
 * How many log lines a run keeps.
 *
 * A first sync writes one line per row, which is tens of thousands for a real
 * catalogue. The list rides in every published `SyncState`, so it has to be
 * bounded — the virtualizer makes *drawing* those lines free, not copying them
 * once per frame.
 */
export const SYNC_LOG_LIMIT = 2_000;

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
  /**
   * The run's detail log, oldest first, at most `SYNC_LOG_LIMIT` lines.
   *
   * Run-level rather than per group: only one group is on screen at a time, and a
   * per-group copy would multiply the same bound by eight.
   */
  logs: SyncLogEntry[];
  /** Lines trimmed off the front of `logs`, so the screen can say how many. */
  logsDropped: number;
  /** What the last run did, once it succeeded. */
  report: SyncReport | null;
  /** The sentence to show when the last run failed. */
  error: string | null;
};

/** The state of a group that has not started, and of an app that never synced. */
export function idleGroup(group: SyncGroup): GroupState {
  return {
    group,
    phase: "idle",
    progress: null,
    message: "",
    transfer: idleTransfer(),
    report: null,
    error: null,
  };
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
  logs: [],
  logsDropped: 0,
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
  /** Parked money rows across the run. */
  pending: number;
  /** Orphans kept and hidden across the run. */
  orphans: number;
  /** Rows/records still owed the server when the run finished; `0` on a clean run. */
  remaining: number;
  /** Image files still owed the server across the run; `0` on a clean run. */
  imagesOwed: number;
};

export type SyncMode = "sync" | "reset";

/**
 * The intervals the Sinkronisasi Otomatis panel offers, in the order it draws
 * them.
 *
 * A short list rather than a free number: "every 7 minutes" is a choice nobody
 * can reason about, and the four stops cover the two real postures — a busy shop
 * (1–2) and a quiet one (5–10). The slider is drawn with one dot per stop, so the
 * list is also what the control can express.
 */
export const AUTO_INTERVALS = [1, 2, 5, 10] as const;

export type AutoInterval = (typeof AUTO_INTERVALS)[number];

/**
 * When the app syncs without being asked (`SYNC-V2.md` §9.10).
 *
 * Two kinds of trigger, and they answer different questions: `everyMinutes` is
 * "how fresh do I want this till", `editGroups` is "this edit should leave now".
 * Both are gated by `enabled`, and both go through the same single-flight gate,
 * so a burst of edits is one extra cycle (§9.11), not one per edit.
 */
export type AutoSync = {
  /** The master switch: a cycle when the app opens, plus everything below. */
  enabled: boolean;
  /**
   * Whether the timer runs at all.
   *
   * A flag of its own rather than `everyMinutes: 0`: a shop that turns the timer
   * off for an afternoon should find its interval where it left it, not reset to
   * the default.
   */
  interval: boolean;
  /** Minutes between cycles. */
  everyMinutes: AutoInterval;
  /**
   * Groups whose local writes start a cycle. Order follows `SYNC_GROUPS`, and a
   * name this build does not know is dropped.
   *
   * Empty is off, not "everything": a shop that wants the timer only says so by
   * turning every row off.
   */
  editGroups: SyncGroup[];
};

/**
 * The switch is off by default, and the sub-switches are set up ready for it: an
 * operator who turns on "Sinkronkan otomatis" gets a working configuration on
 * that one click instead of a page of things to arrange first.
 */
export const AUTO_DEFAULT: AutoSync = {
  enabled: false,
  interval: true,
  everyMinutes: 5,
  editGroups: [...SYNC_GROUPS],
};

/** The stored value, or the defaults when there is none to trust. */
function parseInterval(value: unknown): AutoInterval {
  // Zero and negatives are not stops: they are a file that says nothing useful
  // (`0` was "off" before `interval` existed), so they get the default rather
  // than being snapped up to one minute.
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return AUTO_DEFAULT.everyMinutes;
  }
  // Snap to the nearest stop rather than reject: a build that grows a new stop
  // and one that does not must still agree on something runnable.
  return AUTO_INTERVALS.reduce((best: AutoInterval, stop) =>
    Math.abs(stop - value) < Math.abs(best - value) ? stop : best,
  );
}

/**
 * A stored `AutoSync`, clamped to something the scheduler can run.
 *
 * Same posture as `normalizeMarginEstimate`: anything the store may hold — a
 * partial object from an older build, a string, a group name from a build with
 * more groups — costs the operator their setting at worst, never the app its
 * scheduler. A missing or malformed `editGroups` means "all", because that is
 * what `AUTO_DEFAULT` says and a switch that silently moved would be worse.
 */
export function normalizeAuto(value: unknown): AutoSync {
  if (typeof value !== "object" || value === null) return AUTO_DEFAULT;
  const stored = value as {
    enabled?: unknown;
    interval?: unknown;
    everyMinutes?: unknown;
    editGroups?: unknown;
  };
  const groups: readonly unknown[] = Array.isArray(stored.editGroups)
    ? stored.editGroups
    : AUTO_DEFAULT.editGroups;
  // A value written before `interval` existed carried `everyMinutes: 0` for off.
  const legacyOff = stored.interval === undefined && stored.everyMinutes === 0;
  return {
    enabled: stored.enabled === true,
    interval: stored.interval === undefined ? !legacyOff : stored.interval !== false,
    everyMinutes: parseInterval(stored.everyMinutes),
    // Filtered through `SYNC_GROUPS` so the order is canonical and a name from
    // another build cannot reach the scheduler.
    editGroups: SYNC_GROUPS.filter((group) => groups.includes(group)),
  };
}

/**
 * What the Sinkronisasi Otomatis panel draws: the stored configuration and when
 * the next timer cycle is due.
 *
 * `nextAt` is the service's, not the panel's: a countdown has to survive leaving
 * the screen, and one computed in a component would restart at every mount.
 * `null` when no cycle is scheduled — switched off, interval off, or a run is
 * already in flight and the wait for it is what comes next.
 */
export type AutoSyncState = { auto: AutoSync; nextAt: number | null };

/** The value a fresh subscription sees, before the store has been read. */
export const AUTO_IDLE: AutoSyncState = { auto: AUTO_DEFAULT, nextAt: null };

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
    /**
     * The scoped one-product manual sync (`docs/SYNC-V2-ONE-PRODUCT.md`): push
     * that product's dirty rows, pull the server's snapshot of it, then move its
     * image bytes. It is mutually exclusive with the full run (both sides
     * refuse while the other is active), moves no bookmark, and never touches
     * another group.
     *
     * It is a foreground Effect, not a background run: the detail page owns the
     * spinner and the toast. A `busy` `SyncError` means another sync was active.
     */
    syncProduct: (productId: string) => Effect.Effect<OneProductReport, SyncError>;
    /**
     * When this device syncs on its own (§9.10).
     *
     * `get`/`changes` are the panel's read side; `set` takes a patch and applies
     * it immediately — the switches save on click, like the Perbesaran row, so
     * there is no form to lose half of.
     */
    auto: {
      get: () => Effect.Effect<AutoSyncState>;
      set: (patch: Partial<AutoSync>) => Effect.Effect<AutoSyncState, SyncError>;
      changes: Stream.Stream<AutoSyncState>;
      /**
       * Starts the timers. Idempotent, and the app calls it once at boot.
       *
       * Separate from layer construction because that must stay synchronous
       * (`Effect.runSync`) while this reads the store — and because "arm the
       * scheduler" is a decision the boot sequence makes, not a side effect of
       * asking for the service.
       */
      arm: () => Effect.Effect<void>;
    };
  }
>() {}
