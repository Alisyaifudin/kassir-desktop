/**
 * The sync service: one fiber that owns pull → merge → push → pull per group
 * (`SYNC-V2-MONEY.md`).
 *
 * Everything that decides *what* happens lives in `pull.ts`/`push.ts`/`merge.ts`
 * so those can be tested against a fake transport. This file is the wiring: the
 * store-backed bookmarks and parks, the progress ref the screen paints, and the
 * refresh call that makes a merged row visible to the running app.
 *
 * ## Groups
 *
 * A group is a pair of endpoints plus its own tables and its own bookmark. Today
 * there is exactly one — `money` (`pockets` + `money`) — and the cycle visits the
 * groups in `SYNC_GROUPS` order. Each group reports into its own `GroupState`, so
 * the screen renders one progress bar per group and a finished group keeps saying
 * so while the next one runs; adding a group means adding a case to `syncGroup`,
 * not touching the money flow.
 *
 * ## The only state this service keeps
 *
 * One integer per group — its bookmark, the highest `seq` durably stored — plus
 * each group's park of money rows still waiting for their pocket (§10.1). There
 * is no session, no upload id, no offset and no hash chain: v2 has none of those
 * (§7.1).
 *
 * ## Why the domain service is refreshed here
 *
 * `MoneyService` hydrates its `SubscriptionRef` once and patches it from its own
 * write paths. A row that arrives from the server is written by this service, so
 * without a refresh the Money screen would keep showing yesterday's balance until
 * the app restarts.
 *
 * ## Cancellation
 *
 * A run is a background task: `start` forks it as a daemon, so leaving the screen
 * that started it does not stop it. `cancel` goes through the fiber, and the
 * streaming commands stop their socket in Rust (`sync_cancel`), so the HTTP
 * request really stops rather than draining in the background.
 */
import { Effect, Fiber, Layer, Ref, SubscriptionRef } from "effect";
import { log } from "~/lib/log";
import { DatabaseService } from "../db";
import { MoneyService } from "../money";
import { StoreService } from "../store";
import {
  SYNC_CONFIG_DEFAULT,
  SYNC_GROUPS,
  SYNC_IDLE,
  SyncError,
  SyncService,
  type GroupReport,
  type GroupState,
  type SyncConfig,
  type SyncGroup,
  type SyncHealth,
  type SyncMode,
  type SyncReport,
  type SyncState,
  type SyncStatus,
} from ".";
import { mergePage, type MergeExecutor, type ParkedMoney } from "./merge";
import { pullPage, toSyncError } from "./pull";
import { push } from "./push";
import { discardSyncedStatements, markAllUnsyncedStatements } from "./sql";
import { SyncTransportService, type Endpoint } from "./transport";

/**
 * A group's bookmark (§2.2). One key per group — never one per table — and the
 * only thing that says how far this device has durably got in that group.
 */
function bookmarkKey(group: SyncGroup): string {
  return `sync.${group}.bookmark`;
}

/** Money rows waiting for their pocket (§10.1), as `[{seq,row}]`. */
function parkedKey(group: SyncGroup): string {
  return `sync.${group}.parked`;
}

/** The device's configured server and token (not cursors, but the same store). */
const KEY_BASE_URL = "sync.base_url";
const KEY_TOKEN = "sync.token";
/**
 * This installation's identity, created once and never rotated.
 *
 * It is what lets the server's request log tell two tills apart when they share a
 * sync token, and the value Settings shows when someone has to report a problem.
 */
const KEY_DEVICE_ID = "sync.device_id";

/**
 * How often a running state may be painted.
 *
 * Four paints a second is faster than a cashier can read and slow enough that a
 * long pull is tens of renders instead of thousands. Transitions are never
 * coalesced — see `publishNow`.
 */
const PAINT_INTERVAL_MS = 150;

function numeric(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** A store value that is not the shape we expect is treated as absent. */
function parkedFrom(value: unknown): ParkedMoney[] {
  if (!Array.isArray(value)) return [];
  const out: ParkedMoney[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) continue;
    const candidate = item as { seq?: unknown; row?: unknown };
    const seq = numeric(candidate.seq);
    if (seq === null || typeof candidate.row !== "object" || candidate.row === null) continue;
    out.push({ seq, row: candidate.row as ParkedMoney["row"] });
  }
  return out;
}

export const SyncLive = Layer.effect(
  SyncService,
  Effect.gen(function* () {
    const db = yield* DatabaseService;
    const store = yield* StoreService;
    const transport = yield* SyncTransportService;
    const money = yield* MoneyService;

    const stateRef = yield* SubscriptionRef.make<SyncState>(SYNC_IDLE);
    /**
     * The single-flight gate. A run outlives whoever started it, so the button,
     * the pill's dialog and any future trigger all reach the same loop: whoever
     * wins this flag runs, everyone else is told `already-running`.
     */
    const busy = yield* Ref.make(false);
    const running = yield* Ref.make<Fiber.RuntimeFiber<SyncReport, SyncError> | null>(null);

    /** The newest state, and when it was last painted — see `publish`. */
    let latest: SyncState = SYNC_IDLE;
    let paintedAt = 0;
    let paintTimer: ReturnType<typeof setTimeout> | null = null;

    function paint(): void {
      if (paintTimer !== null) {
        clearTimeout(paintTimer);
        paintTimer = null;
      }
      paintedAt = Date.now();
      Effect.runSync(SubscriptionRef.set(stateRef, latest));
    }

    /** Publishes progress, coalesced to one paint per `PAINT_INTERVAL_MS`. */
    function publish(): void {
      const since = Date.now() - paintedAt;
      if (since >= PAINT_INTERVAL_MS) {
        paint();
        return;
      }
      if (paintTimer === null) paintTimer = setTimeout(paint, PAINT_INTERVAL_MS - since);
    }

    /** Publishes a transition immediately — a delayed phase change is a lie. */
    function publishNow(next: SyncState): void {
      latest = next;
      paint();
    }

    /**
     * Replaces one group's slice of `latest`, leaving the other groups alone.
     *
     * `progress` is clamped upward: a bar that can shrink is a bar that runs
     * backwards, and no phase boundary — let alone a page of a growing backlog —
     * should ever take it back. Everything else is a plain replacement, so the
     * caption and phase still change freely.
     */
    function setGroup(group: SyncGroup, fields: Partial<GroupState>): void {
      latest = {
        ...latest,
        groups: latest.groups.map((entry) => {
          if (entry.group !== group) return entry;
          const next = { ...entry, ...fields };
          if (fields.progress !== undefined && fields.progress !== null) {
            next.progress = Math.max(entry.progress ?? 0, fields.progress);
          }
          return next;
        }),
      };
    }

    /** A group's progress tick (coalesced). */
    function publishGroup(group: SyncGroup, fields: Partial<GroupState>): void {
      setGroup(group, fields);
      publish();
    }

    /** A group's phase change (immediate). */
    function publishGroupNow(group: SyncGroup, fields: Partial<GroupState>): void {
      setGroup(group, fields);
      publishNow(latest);
    }

    /** Reads a store key, treating "absent" as the default. */
    function read<T>(key: string, fallback: T): Effect.Effect<T> {
      return store.get<T>(key).pipe(Effect.orElseSucceed(() => fallback));
    }

    function write(key: string, value: unknown): Effect.Effect<void, SyncError> {
      return store
        .set(key, value)
        .pipe(Effect.mapError((error) => new SyncError({ message: error.message })));
    }

    function remove(key: string): Effect.Effect<void> {
      return store.remove(key).pipe(
        Effect.orElseSucceed(() => undefined),
        Effect.asVoid,
      );
    }

    function readBookmark(group: SyncGroup): Effect.Effect<number> {
      return read<unknown>(bookmarkKey(group), 0).pipe(Effect.map((value) => numeric(value) ?? 0));
    }

    function writeBookmark(group: SyncGroup, seq: number): Effect.Effect<void, SyncError> {
      return write(bookmarkKey(group), seq);
    }

    function readParked(group: SyncGroup): Effect.Effect<ParkedMoney[]> {
      return read<unknown>(parkedKey(group), []).pipe(Effect.map(parkedFrom));
    }

    function writeParked(
      group: SyncGroup,
      parked: readonly ParkedMoney[],
    ): Effect.Effect<void, SyncError> {
      return parked.length === 0
        ? remove(parkedKey(group)).pipe(Effect.asVoid)
        : write(parkedKey(group), parked);
    }

    /** Re-reads the money ref after a merge, so the screen shows the new rows. */
    function refreshMoney(): Effect.Effect<void> {
      return money.refresh().pipe(
        Effect.asVoid,
        // A refresh is a convenience for the running UI; the merge itself is on
        // disk and correct. Failing the whole sync over it would be worse.
        Effect.catchAllCause((cause) =>
          Effect.sync(() => log.error(new Error(`sync: refresh failed: ${String(cause)}`))),
        ),
      );
    }

    /**
     * The installation id, minted on first use.
     *
     * Failing to persist it would not fail the sync: an unattributable request is
     * worse than a missing one, but it is not worse than not syncing at all.
     */
    function deviceId(): Effect.Effect<string> {
      return Effect.gen(function* () {
        const stored = yield* read<unknown>(KEY_DEVICE_ID, "");
        if (typeof stored === "string" && stored !== "") return stored;
        const minted = crypto.randomUUID();
        yield* write(KEY_DEVICE_ID, minted).pipe(Effect.orElseSucceed(() => undefined));
        return minted;
      });
    }

    function getConfig(): Effect.Effect<SyncConfig, SyncError> {
      return Effect.gen(function* () {
        const baseUrl = yield* read<unknown>(KEY_BASE_URL, SYNC_CONFIG_DEFAULT.baseUrl);
        const token = yield* read<unknown>(KEY_TOKEN, SYNC_CONFIG_DEFAULT.token);
        return {
          baseUrl: typeof baseUrl === "string" ? baseUrl : SYNC_CONFIG_DEFAULT.baseUrl,
          token: typeof token === "string" ? token : "",
        };
      });
    }

    /**
     * The configured server as a request target, or the sentence that says which
     * half is missing.
     *
     * Trailing slashes are stripped here rather than trusted from the store: the
     * Rust side appends `/v2/...` to whatever it is given, so `https://x/` would
     * ask for `https://x//v2/...`.
     */
    function endpointOf(config: SyncConfig): Effect.Effect<Endpoint, SyncError> {
      return Effect.gen(function* () {
        const baseUrl = config.baseUrl.trim().replace(/\/+$/, "");
        const token = config.token.trim();
        if (baseUrl === "") {
          return yield* Effect.fail(
            new SyncError({
              message: "Alamat server belum diisi. Isi di Pengaturan → Sinkronisasi.",
              code: "bad_request",
            }),
          );
        }
        if (token === "") {
          return yield* Effect.fail(
            new SyncError({
              message: "Token sinkronisasi belum diisi. Isi di Pengaturan → Sinkronisasi.",
              code: "unauthorized",
              status: 401,
            }),
          );
        }
        return { baseUrl, token, deviceId: yield* deviceId() };
      });
    }

    /**
     * The Cek button's one question: does this server answer, and does this token
     * work against it?
     *
     * The address goes through `endpointOf` like a real run, so a Cek that passes
     * is a check of exactly the request the cycle will make. Only a 2xx becomes a
     * `SyncHealth`; everything else — a rejected token, a host that does not
     * resolve, a proxy's HTML error page — is a `SyncError` carrying the sentence
     * the screen shows inline.
     */
    function checkHealth(config: SyncConfig): Effect.Effect<SyncHealth, SyncError> {
      return Effect.gen(function* () {
        const endpoint = yield* endpointOf(config);
        return yield* Effect.tryPromise({
          try: () => transport.health(endpoint),
          catch: toSyncError,
        });
      });
    }

    /** The statements, applied as one real transaction by `sync_merge` in Rust. */
    const mergeExecutor: MergeExecutor = (statements, what) =>
      statements.length === 0
        ? Effect.void
        : Effect.tryPromise({
            try: () => transport.merge(statements),
            catch: (error) =>
              new SyncError({
                message: `Sinkronisasi ${what} gagal disimpan: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              }),
          }).pipe(Effect.asVoid);

    /**
     * `Sinkronisasi Ulang`: every bookmark to zero, every park dropped, every row
     * queued.
     *
     * The queueing is what gives a device whose rows predate v2 a server-side
     * counterpart: they are not marked synced because there is nothing to be
     * synced with yet (§17.2.2).
     */
    function resetLocal(): Effect.Effect<void, SyncError> {
      return Effect.gen(function* () {
        for (const group of SYNC_GROUPS) {
          yield* writeBookmark(group, 0);
          yield* writeParked(group, []);
        }
        yield* db.transaction(markAllUnsyncedStatements()).pipe(
          Effect.mapError(
            (error) =>
              new SyncError({
                message: `Gagal menandai data untuk sinkronisasi: ${error.message}`,
              }),
          ),
        );
        log.info("sync: reset — bookmarks cleared, every pocket and money row queued for push");
      });
    }

    /**
     * The recovery for a bookmark the server will not serve (§6.6): `400` (the
     * bookmark is ahead of the server) and `410` (older than its retained
     * history) both mean "this device's mirror came from somewhere else", so the
     * synced rows go and the group is pulled from zero. Unsynced rows survive and
     * are re-pushed afterwards.
     */
    function discardSynced(group: SyncGroup): Effect.Effect<void, SyncError> {
      return Effect.gen(function* () {
        yield* writeBookmark(group, 0);
        yield* writeParked(group, []);
        yield* db
          .transaction(discardSyncedStatements())
          .pipe(
            Effect.mapError(
              (error) =>
                new SyncError({ message: `Gagal membersihkan data lama: ${error.message}` }),
            ),
          );
        yield* refreshMoney();
        log.info("sync: bookmark was refused — discarded synced rows and restarting the pull");
      });
    }

    function isRefusedBookmark(error: SyncError): boolean {
      return error.status === 400 || error.status === 410;
    }

    /**
     * How the cycle's work is spread over its one bar, as fractions of the whole.
     *
     * Pulling is the bulk of a run (a first sync is all pull), pushing is one
     * round trip per 1000 rows, and the closing pull is usually empty. Weights, not
     * phase-local bars: the bar must never restart, so each phase gets a slice of
     * the single fraction instead of a fraction of its own.
     */
    const STAGE_WEIGHT = {
      pull: [0, 0.6],
      push: [0.6, 0.95],
      settle: [0.95, 1],
    } as const;

    type Stage = keyof typeof STAGE_WEIGHT;

    /** Places a phase-local fraction (0…1) inside its slice of the cycle's bar. */
    function withinStage(stage: Stage, fraction: number): number {
      const [from, to] = STAGE_WEIGHT[stage];
      const clamped = Number.isFinite(fraction) ? Math.min(1, Math.max(0, fraction)) : 0;
      return from + (to - from) * clamped;
    }

    /**
     * The money group's cycle: pull until caught up, push what is owed, pull once
     * more (§11.4).
     *
     * One page = one request + one merge + one bookmark write (§6.4). A refused
     * bookmark is recovered once per group per run; a second refusal is a real
     * failure and stops the run instead of looping.
     *
     * ## The one bar
     *
     * `meta.snapshot` of the first page is the run's target, and `done.s` is how
     * far the ledger has actually been stored, so the pull has a real
     * denominator: `(stored - start) / (target - start)`. That is why the bar
     * advances page by page instead of filling and emptying per phase.
     */
    function moneyCycle(endpoint: Endpoint): Effect.Effect<GroupReport, SyncError> {
      return Effect.gen(function* () {
        const group: SyncGroup = "money";
        let parked = yield* readParked(group);
        let pulled = 0;
        let stale = 0;

        // The bookmark this run started from, and the first snapshot it saw.
        const startAt = yield* readBookmark(group);
        let target: number | null = null;

        /** How far the pull is, as a 0…1 fraction of the changes this run must fetch. */
        const pullFraction = (stored: number): number => {
          if (target === null) return 0;
          const span = target - startAt;
          if (span <= 0) return 1;
          return (stored - startAt) / span;
        };

        const pullAll = (recover: boolean, stage: Stage): Effect.Effect<void, SyncError> =>
          Effect.gen(function* () {
            for (;;) {
              const after = yield* readBookmark(group);

              publishGroupNow(group, {
                phase: "pull",
                message: after === 0 ? "Mengunduh semua perubahan…" : "Mengunduh perubahan…",
              });
              const outcome = yield* pullPage({
                transport,
                endpoint,
                after,
                onProgress: () =>
                  // A page arrives whole, so there is nothing to report mid-request.
                  publishGroup(group, { phase: "pull", message: "Mengunduh perubahan…" }),
              }).pipe(Effect.either);

              if (outcome._tag === "Left") {
                if (!recover || !isRefusedBookmark(outcome.left)) {
                  return yield* Effect.fail(outcome.left);
                }
                yield* discardSynced(group);
                // The target of a discarded mirror is meaningless; the restart
                // sizes it again from the first page of the fresh pull.
                target = null;
                return yield* pullAll(false, stage);
              }

              const page = outcome.right;
              if (target === null && page.snapshot !== null && page.snapshot > startAt) {
                target = page.snapshot;
              }

              const frames = page.page.changes.length + page.page.deletions.length;
              publishGroupNow(group, { phase: "merge", message: "Menyimpan hasil unduhan…" });
              const merged = yield* mergePage({ db, execute: mergeExecutor }, page.page, parked);
              parked = merged.parked;
              yield* writeParked(group, parked);
              // §6.4: `done.s`, never `meta.snapshot` — the page can stop early.
              // Never backwards: a page that reports a seq below the bookmark is
              // a broken server, and moving back would loop on the same page.
              const stored = Math.max(after, page.lastSeq);
              yield* writeBookmark(group, stored);
              yield* refreshMoney();

              pulled += frames;
              stale += merged.stats.stale;
              // Progress is published after the commit, so the bar only ever
              // reports data that is actually on disk.
              publishGroup(group, {
                phase: "pull",
                progress: withinStage(stage, pullFraction(stored)),
                message: page.more ? "Mengunduh perubahan…" : "Unduhan selesai",
              });
              if (!page.more) return;
            }
          });

        yield* pullAll(true, "pull");

        publishGroupNow(group, { phase: "push", message: "Mengunggah perubahan…" });
        const pushed = yield* push({
          db,
          transport,
          endpoint,
          execute: mergeExecutor,
          onProgress: (progress) =>
            publishGroup(group, {
              phase: "push",
              progress: withinStage(
                "push",
                progress.total === 0 ? 1 : progress.done / progress.total,
              ),
              message:
                progress.entity === null
                  ? "Mengunggah perubahan…"
                  : `Mengunggah ${progress.entity}…`,
            }),
        });
        yield* refreshMoney();

        // §11.3 "pull → push → pull": the final pull picks up whatever another
        // till wrote while this one was pushing, and is usually one empty page.
        yield* pullAll(false, "settle");

        return {
          bookmark: yield* readBookmark(group),
          pulled,
          pushed: pushed.pushed,
          stale: stale + pushed.stale,
        };
      });
    }

    /** Runs one group's cycle. Today there is one; a new group adds a case here. */
    function syncGroup(
      group: SyncGroup,
      endpoint: Endpoint,
    ): Effect.Effect<GroupReport, SyncError> {
      switch (group) {
        case "money":
          return moneyCycle(endpoint);
      }
    }

    /**
     * The whole run: every group in order, one progress bar each.
     *
     * Every state published here carries this run's `startedAt`, so the pill can
     * count elapsed time and a finished run still says when it began. The builder
     * is per-run on purpose: two runs must never blend their counters.
     */
    function execute(mode: SyncMode): Effect.Effect<SyncReport, SyncError> {
      const startedAt = Date.now();
      const state = (status: SyncStatus, fields: Partial<SyncState> = {}): SyncState => ({
        status,
        groups: SYNC_IDLE.groups.map((entry) => ({ ...entry })),
        message: "",
        startedAt,
        finishedAt: null,
        report: null,
        error: null,
        ...fields,
      });

      return Effect.gen(function* () {
        const endpoint = yield* endpointOf(yield* getConfig());

        if (mode === "reset") {
          publishNow(state("preparing", { message: "Menyiapkan sinkronisasi ulang…" }));
          yield* resetLocal();
        }

        // A fresh run starts every bar at idle, so a previous run's "Selesai"
        // does not sit next to a group that is working again.
        publishNow(state("running", { message: "Menyinkronkan…" }));

        const reports = {} as Record<SyncGroup, GroupReport>;
        for (const group of SYNC_GROUPS) {
          const report = yield* syncGroup(group, endpoint).pipe(
            Effect.catchAll((error) =>
              Effect.gen(function* () {
                // The failure belongs to the group that hit it; the run-level
                // terminal state is published below, once.
                publishGroupNow(group, {
                  phase: "failed",
                  message: error.message,
                  error: error.message,
                });
                return yield* Effect.fail(error);
              }),
            ),
          );
          reports[group] = report;
          publishGroupNow(group, {
            phase: "done",
            progress: 1,
            message: `Selesai — ${report.pulled} diunduh, ${report.pushed} diunggah`,
            report,
          });
        }

        const totals = Object.values(reports).reduce(
          (sum, report) => ({
            pulled: sum.pulled + report.pulled,
            pushed: sum.pushed + report.pushed,
            stale: sum.stale + report.stale,
          }),
          { pulled: 0, pushed: 0, stale: 0 },
        );
        const report: SyncReport = { groups: reports, ...totals };
        publishNow(
          state("done", {
            groups: latest.groups,
            message: `Selesai — ${totals.pulled} diunduh, ${totals.pushed} diunggah`,
            report,
            finishedAt: Date.now(),
          }),
        );
        return report;
      }).pipe(
        // The terminal states belong to the run, not to whoever is watching: a
        // background run's failure must be visible after the screen that started
        // it is long gone.
        Effect.catchAll((error) =>
          Effect.gen(function* () {
            publishNow(
              state("failed", {
                groups: latest.groups,
                message: error.message,
                error: error.message,
                finishedAt: Date.now(),
              }),
            );
            return yield* Effect.fail(error);
          }),
        ),
        Effect.onInterrupt(() =>
          Effect.sync(() => {
            publishNow(
              state("cancelled", {
                groups: latest.groups,
                message: "Sinkronisasi dibatalkan",
                finishedAt: Date.now(),
              }),
            );
          }),
        ),
      );
    }

    /** The loop, registering itself so `cancel` can interrupt it. */
    function loop(mode: SyncMode): Effect.Effect<SyncReport, SyncError> {
      return Effect.withFiberRuntime((fiber) =>
        Effect.gen(function* () {
          yield* Ref.set(running, fiber);
          return yield* execute(mode).pipe(Effect.ensuring(Ref.set(running, null)));
        }),
      );
    }

    return {
      config: {
        get: () => getConfig(),
        // The same mint-and-persist the sync itself uses: one definition, so the
        // id on screen is the id that reaches the server's log.
        deviceId: () => deviceId(),
        set: (config) =>
          Effect.gen(function* () {
            yield* write(KEY_BASE_URL, config.baseUrl.trim());
            yield* write(KEY_TOKEN, config.token.trim());
          }),
      },
      check: (config) => checkHealth(config),
      cursor: (group: SyncGroup = "money") => readBookmark(group),
      run: (mode) => loop(mode),
      start: (mode) =>
        Effect.gen(function* () {
          // Atomic claim: two callers that both saw "not busy" must not both fork.
          const free = yield* Ref.modify(busy, (current): readonly [boolean, boolean] =>
            current ? [false, current] : [true, true],
          );
          if (!free) return "already-running" as const;

          // A daemon, not a child of the caller: the run must outlive the fiber
          // that asked for it (a screen that unmounts, a dialog that closes).
          yield* loop(mode).pipe(Effect.ensuring(Ref.set(busy, false)), Effect.forkDaemon);
          return "started" as const;
        }).pipe(
          // Between the claim and the fork there is no fiber to inherit the
          // release, so an interrupt here would leave the gate shut for the rest
          // of the session — every later `start` answering `already-running`.
          Effect.onInterrupt(() => Ref.set(busy, false)),
        ),
      cancel: () =>
        Effect.gen(function* () {
          const current = yield* Ref.get(running);
          if (current === null) return;
          // Said before the interrupt: delivery happens at the loop's next async
          // boundary, so an in-flight request or merge settles first.
          publishNow({
            ...latest,
            status: "cancelling",
            message: "Membatalkan…",
            finishedAt: null,
          });
          yield* Fiber.interrupt(current);
        }),
      // A `SubscriptionRef.changes` stream already replays the current value, so
      // a pill that mounts in the middle of a run paints immediately.
      state: stateRef.changes,
    };
  }),
);
