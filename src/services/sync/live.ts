/**
 * The sync service: one fiber that owns pull → merge → push (contract §5).
 *
 * Everything that decides *what* happens lives in `pull.ts`/`push.ts`/`merge.ts`
 * so those can be tested against a fake transport. This file is the wiring: the
 * store-backed cursors (§3.2), the progress ref the screen paints, and the
 * refresh calls that make a merged row visible to the running app.
 *
 * ## Why the domain services are refreshed here
 *
 * Every domain service hydrates its `SubscriptionRef` once and patches it from its
 * own write paths. A row that arrives from the server is written by this service,
 * so without a refresh the POS would keep selling yesterday's price until the app
 * restarts. The owning service's `refresh()` re-reads its table — the same call
 * `product.refresh()` already exposes for imports and deletes.
 *
 * ## Cancellation
 *
 * A run is a background task: `start` forks it as a daemon, so leaving the screen
 * that started it does not stop it. That makes `cancel` the only way a run ends
 * early, and it goes through the fiber's finalizers — `pull.ts`/`push.ts` call
 * `sync_cancel` in Rust, so the HTTP request really stops rather than draining in
 * the background.
 *
 * Interruption is delivered at the run's current async boundary, so an in-flight
 * `sync_merge` or upload chunk settles before the loop unwinds. That is why the
 * activity is `cancelling` for however long it takes: a state that said
 * `cancelled` while a transaction was still committing would be a lie.
 */
import { Effect, Fiber, Layer, Ref, SubscriptionRef } from "effect";
import { log } from "~/lib/log";
import { CustomerService } from "../customer";
import { DatabaseService } from "../db";
import { ExtraService } from "../extra";
import { MethodService } from "../method";
import { MoneyService } from "../money";
import { ProductService } from "../product";
import { SocialService } from "../social";
import { StoreService } from "../store";
import { SupplierService } from "../supplier";
import {
  SYNC_CONFIG_DEFAULT,
  SYNC_IDLE,
  SyncError,
  SyncService,
  type SyncConfig,
  type SyncMode,
  type SyncState,
  type SyncStatus,
  type SyncReport,
} from ".";
import { dbFailure, makeMerger, type MergeExecutor } from "./merge";
import { pull, toSyncError } from "./pull";
import { push } from "./push";
import { resetSyncStatements } from "./sql";
import { SyncTransportService, type Endpoint } from "./transport";

/** Cursor keys, exactly as the contract names them (§3.2). */
const KEY_LAST_PULLED = "sync.last_pulled_seq";
const KEY_UPLOAD_ID = "sync.upload_id";
const KEY_UPLOAD_OFFSET = "sync.upload_offset";
const KEY_UPLOAD_FRAMES = "sync.upload_frames";
/** Not in §3.2: the chain hash at `upload_offset`, for diagnostics and resume. */
const KEY_UPLOAD_CHAIN = "sync.upload_chain";
/** The device's configured server and token (not cursors, but the same store). */
const KEY_BASE_URL = "sync.base_url";
const KEY_TOKEN = "sync.token";
/**
 * This installation's identity, created once and never rotated.
 *
 * It is what lets the server log tell two tills apart when they share a sync
 * token (kassir-backend/docs/LOGS.md). It survives a reinstall of the webview
 * because it lives in the store next to the token, but not a wipe of the app's
 * data — at which point it is a new install, which is the truth of the matter.
 */
const KEY_DEVICE_ID = "sync.device_id";

/**
 * How often a running state may be painted.
 *
 * `pull`/`push` report once per frame, and every subscriber re-renders on a
 * publish. Four paints a second is faster than a cashier can read and slow enough
 * that a 5 000-frame pull is 40 renders instead of 5 000. Transitions are never
 * coalesced — see `publishNow`.
 */
const PAINT_INTERVAL_MS = 150;

function numeric(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export const SyncLive = Layer.effect(
  SyncService,
  Effect.gen(function* () {
    const db = yield* DatabaseService;
    const store = yield* StoreService;
    const transport = yield* SyncTransportService;
    const product = yield* ProductService;
    const customer = yield* CustomerService;
    const supplier = yield* SupplierService;
    const extra = yield* ExtraService;
    const method = yield* MethodService;
    const money = yield* MoneyService;
    const social = yield* SocialService;

    const stateRef = yield* SubscriptionRef.make<SyncState>(SYNC_IDLE);
    /**
     * The single-flight gate. A run outlives whoever started it, so the button, the
     * pill's dialog and any future trigger all reach the same loop: whoever wins
     * this flag runs, everyone else is told `already-running`.
     */
    const busy = yield* Ref.make(false);
    // The loop's fiber, however it was started, so `cancel` can reach it.
    const running = yield* Ref.make<Fiber.RuntimeFiber<SyncReport, SyncError> | null>(null);

    /** The newest state, and when it was last painted — see `publish`. */
    let latest: SyncState = SYNC_IDLE;
    let paintedAt = 0;
    let paintTimer: ReturnType<typeof setTimeout> | null = null;

    /** Writes `latest` to the ref, and stops any paint that was waiting for it. */
    function paint(): void {
      if (paintTimer !== null) {
        clearTimeout(paintTimer);
        paintTimer = null;
      }
      paintedAt = Date.now();
      Effect.runSync(SubscriptionRef.set(stateRef, latest));
    }

    /**
     * Publishes progress, coalesced to one paint per `PAINT_INTERVAL_MS`.
     *
     * Synchronous on purpose: `pull`/`push` report from inside their loops, and a
     * `SubscriptionRef` update is a plain ref write. The timer only decides *when*
     * the write happens; the value is always the newest one.
     */
    function publish(next: SyncState): void {
      latest = next;
      const since = Date.now() - paintedAt;
      if (since >= PAINT_INTERVAL_MS) {
        paint();
        return;
      }
      if (paintTimer === null) paintTimer = setTimeout(paint, PAINT_INTERVAL_MS - since);
    }

    /**
     * Publishes a transition immediately.
     *
     * A dropped or delayed phase change is a worse lie than a cheap render: the
     * pill would say "Mengunduh" while the merge is already writing. Every state a
     * run enters goes through here; only the counters inside a phase use `publish`.
     */
    function publishNow(next: SyncState): void {
      latest = next;
      paint();
    }

    /** Reads a store key, treating "absent" as the default. */
    function read<T>(key: string, fallback: T): Effect.Effect<T> {
      // A missing key and an unreadable store are both "use the default": the
      // cursors are the only thing here, and a fresh device has none.
      return store.get<T>(key).pipe(Effect.orElseSucceed(() => fallback));
    }

    function write(key: string, value: unknown): Effect.Effect<void, SyncError> {
      return store
        .set(key, value)
        .pipe(Effect.mapError((error) => new SyncError({ message: error.message })));
    }

    function remove(key: string): Effect.Effect<void, SyncError> {
      return store
        .remove(key)
        .pipe(Effect.mapError((error) => new SyncError({ message: error.message })), Effect.asVoid)
        .pipe(Effect.orElseSucceed(() => undefined));
    }

    /** §3.2: `last_pulled_seq`, persisted after every page. */
    function readCursor(): Effect.Effect<number, SyncError> {
      return read<unknown>(KEY_LAST_PULLED, 0).pipe(Effect.map((value) => numeric(value) ?? 0));
    }

    function writeCursor(seq: number): Effect.Effect<void, SyncError> {
      return write(KEY_LAST_PULLED, seq);
    }

    function readSession(): Effect.Effect<{
      uploadId: string;
      at: number;
      frames: number;
      chain: string;
    } | null> {
      return Effect.gen(function* () {
        const uploadId = yield* read<unknown>(KEY_UPLOAD_ID, null);
        if (typeof uploadId !== "string" || uploadId === "") return null;
        const at = numeric(yield* read<unknown>(KEY_UPLOAD_OFFSET, 0)) ?? 0;
        const frames = numeric(yield* read<unknown>(KEY_UPLOAD_FRAMES, 0)) ?? 0;
        const chain = yield* read<unknown>(KEY_UPLOAD_CHAIN, "");
        return { uploadId, at, frames, chain: typeof chain === "string" ? chain : "" };
      });
    }

    function writeSession(state: {
      uploadId: string;
      at: number;
      frames: number;
      chain: string;
    }): Effect.Effect<void, SyncError> {
      return Effect.all(
        [
          write(KEY_UPLOAD_ID, state.uploadId),
          write(KEY_UPLOAD_OFFSET, state.at),
          write(KEY_UPLOAD_FRAMES, state.frames),
          write(KEY_UPLOAD_CHAIN, state.chain),
        ],
        { concurrency: "unbounded" },
      ).pipe(Effect.asVoid);
    }

    function clearSession(): Effect.Effect<void, SyncError> {
      return Effect.all(
        [
          remove(KEY_UPLOAD_ID),
          remove(KEY_UPLOAD_OFFSET),
          remove(KEY_UPLOAD_FRAMES),
          remove(KEY_UPLOAD_CHAIN),
        ],
        { concurrency: "unbounded" },
      ).pipe(Effect.asVoid);
    }

    /** Re-reads the refs a merged row must be visible in, after a pull or a push. */
    function refreshServices(): Effect.Effect<void> {
      return Effect.all(
        [
          product.refresh(),
          customer.refresh(),
          supplier.refresh(),
          extra.refresh(),
          method.refresh(),
          money.refresh(),
          social.refresh(),
        ],
        { concurrency: "unbounded" },
      ).pipe(
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
     * worse than a missing one, but it is not worse than not syncing at all. So a
     * store write that fails yields the minted id for this run and the next run
     * mints another.
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
          baseUrl: typeof baseUrl === "string" ? baseUrl : "",
          token: typeof token === "string" ? token : "",
        };
      });
    }

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

    /** §3.2 `Sinkronisasi Ulang`: cursors to zero, session dropped, all rows queued. */
    function resetLocal(endpoint: Endpoint): Effect.Effect<void, SyncError> {
      return Effect.gen(function* () {
        const session = yield* readSession();
        if (session !== null) {
          yield* Effect.tryPromise({
            try: () => transport.deleteSession(endpoint, session.uploadId),
            catch: () => new SyncError({ message: "Sesi unggahan lama gagal dihapus" }),
          }).pipe(Effect.catchAll(() => Effect.void));
        }
        yield* clearSession();
        yield* writeCursor(0);
        yield* db.transaction(resetSyncStatements()).pipe(
          Effect.mapError(
            (error) =>
              new SyncError({
                message: `Gagal menandai data untuk sinkronisasi: ${error.message}`,
              }),
          ),
        );
        log.info("sync: reset — cursors cleared, every row queued for push");
      });
    }

    /**
     * Hands a merge batch to the Rust `sync_merge` command, which runs it as one
     * transaction on its own connection — plugin-sql has no transaction handle, so
     * this is the only way the pull commits atomically.
     */
    const mergeExecutor: MergeExecutor = (statements, what) =>
      Effect.tryPromise({
        try: () => transport.merge(statements),
        catch: (error) => {
          const failure = toSyncError(error);
          return dbFailure(what, { message: failure.message, detail: failure.message });
        },
      }).pipe(Effect.asVoid);

    /**
     * The seq the cursor may safely jump to after a push, or `null`.
     *
     * Contiguity from the pull snapshot is the whole check: `snapshot + 1 …` with no
     * gaps means every seq in that range was assigned to a frame this run pushed, so
     * nothing was skipped. A gap means another writer interleaved, and the cursor
     * must not move past rows this device has not merged.
     */
    function advanceCursor(snapshot: number | null, seqs: number[]): number | null {
      if (snapshot === null || seqs.length === 0) return null;
      const ordered = [...new Set(seqs)].sort((a, b) => a - b);
      const first = ordered[0];
      const last = ordered[ordered.length - 1];
      if (first === undefined || last === undefined) return null;
      if (first !== snapshot + 1 || last !== snapshot + ordered.length) return null;
      return last;
    }

    /**
     * Reports a failure the server cannot see for itself (`POST /v1/diagnostics`).
     *
     * Only for failures that carry evidence — a real request that died mid-body.
     * A config error, a cancelled sync or a failed merge has nothing to report and
     * must not add noise to the server's log.
     *
     * Fire-and-forget, and never allowed to change the outcome: the device is
     * already showing this error, and a failed report is not a second error worth
     * surfacing. Failure to report is itself logged locally, so a `warn` in the
     * log page is the worst case.
     */
    function reportFailure(endpoint: Endpoint, error: SyncError): Effect.Effect<void> {
      const evidence = error.evidence;
      if (evidence === undefined) return Effect.void;
      return Effect.sync(() => {
        void transport
          .diagnose(endpoint, {
            clientRequestId: evidence.requestId,
            stage: error.stage ?? "stream",
            route: evidence.route,
            message: error.message,
            firstBytesHex: evidence.firstBytesHex,
            bytes: evidence.bytes,
          })
          .catch((cause: unknown) => {
            // Warning-level, but logged as an error: the log page only has two
            // levels, and a report that did not arrive is what makes the next
            // investigation harder.
            log.error(
              `sync: failure report not delivered: ${
                cause instanceof Error ? cause.message : String(cause)
              }`,
            );
          });
      });
    }

    /**
     * The whole loop. `reset` clears the cursors and unsync markers first (§3.2).
     *
     * Every state published here carries this run's `startedAt`, so the pill can
     * count elapsed time and a finished run still says when it began. The builder
     * is per-run on purpose: two runs must never blend their counters.
     */
    function execute(mode: SyncMode): Effect.Effect<SyncReport, SyncError> {
      const startedAt = Date.now();
      const state = (status: SyncStatus, fields: Partial<SyncState> = {}): SyncState => ({
        status,
        entity: null,
        done: 0,
        total: 0,
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
          yield* resetLocal(endpoint);
        }

        // 1. Pull: stream the whole gap. Nothing is written yet.
        publishNow(state("pull", { message: "Mengunduh perubahan…" }));
        const pulled = yield* pull({
          transport,
          endpoint,
          readCursor,
          onProgress: (progress) => {
            publish(
              state("pull", {
                entity: progress.entity,
                done: progress.done,
                total: progress.total,
                message:
                  progress.entity === null
                    ? "Mengunduh perubahan…"
                    : `Mengunduh ${progress.entity}…`,
              }),
            );
          },
        });

        // 2. Merge: the whole pull planned at once, applied in bounded slices, then
        //    the cursor moves — so a failure, a cancel or a crash re-pulls the same
        //    gap instead of skipping it.
        //    `now` is a thunk: a run that took minutes to pull must stamp `_sync_at`
        //    with the time of the write, not the time the run began.
        const merger = makeMerger(db, () => Date.now(), mergeExecutor);
        const frameCount = pulled.frames.rows.length + pulled.frames.aggregates.length;
        publishNow(state("merge", { total: frameCount, message: "Menyimpan hasil unduhan…" }));
        const merged = yield* merger.mergeFrames(pulled.frames, (progress) => {
          publish(
            state("merge", {
              done: progress.done,
              total: progress.total,
              message: "Menyimpan hasil unduhan…",
            }),
          );
        });
        yield* writeCursor(pulled.lastPulledSeq);
        publish(state("merge", { done: frameCount, total: frameCount, message: "Hasil unduhan tersimpan" }));
        yield* refreshServices();

        // 3. Push: upload what this device owes the server.
        publishNow(state("push", { message: "Mengunggah perubahan…" }));
        const pushed = yield* push({
          db,
          transport,
          endpoint,
          readUploadId: () =>
            readSession().pipe(Effect.map((session) => session?.uploadId ?? null)),
          writeUploadState: (state) =>
            writeSession(state).pipe(Effect.catchAll(() => Effect.void)),
          clearUploadState: () => clearSession().pipe(Effect.catchAll(() => Effect.void)),
          mergeStaleRow: (entity, row, onlyIfClock) =>
            merger.mergeStaleRow(entity, row, onlyIfClock),
          mergeStaleAggregate: (row, children, onlyIfClock) =>
            merger.mergeStaleAggregate(row, children, onlyIfClock),
          onProgress: (progress) => {
            publish(
              state("push", {
                entity: progress.entity,
                done: progress.done,
                total: progress.total,
                message:
                  progress.entity === null
                    ? "Mengunggah perubahan…"
                    : `Mengunggah ${progress.entity}…`,
              }),
            );
          },
        });
        yield* refreshServices();

        // §5.3: an `applied` ack carries the server's `sync_seq`, and the client may
        // move its pull cursor past rows it just pushed. Without this the next run
        // re-downloads everything this one uploaded — for a first full sync, the
        // whole database. The move is taken only when the assigned seqs run
        // contiguously on from the pull snapshot, which proves no other writer
        // interleaved rows this run never saw; otherwise the cursor stays put and
        // the next pull picks those rows up.
        const advanced = advanceCursor(pulled.snapshotSeq, pushed.appliedSeqs);
        if (advanced !== null && advanced > pulled.lastPulledSeq) {
          yield* writeCursor(advanced);
        }

        const lastPulledSeq = yield* readCursor();
        const report: SyncReport = {
          lastPulledSeq,
          pulled: merged.merged,
          pushed: pushed.pushed,
          stale: pushed.stale,
        };
        publishNow(
          state("done", {
            done: merged.merged,
            total: pushed.pushed,
            message: `Selesai — ${merged.merged} diunduh, ${pushed.pushed} diunggah`,
            report,
            finishedAt: Date.now(),
          }),
        );
        return report;
      }).pipe(
        // `tapError`, not `catchAll`: the failure still reaches the caller, the
        // report is a side effect on the way out.
        Effect.tapError((error) =>
          Effect.gen(function* () {
            const endpoint = yield* endpointOf(yield* getConfig()).pipe(
              Effect.catchAll(() => Effect.succeed(null)),
            );
            if (endpoint !== null) yield* reportFailure(endpoint, error);
          }),
        ),
        // The terminal states belong to the run, not to whoever is watching: a
        // background run's failure must be visible after the screen that started it
        // is long gone.
        Effect.catchAll((error) =>
          Effect.gen(function* () {
            publishNow(
              state("failed", {
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
                message: "Sinkronisasi dibatalkan",
                finishedAt: Date.now(),
              }),
            );
          }),
        ),
      );
    }

    /**
     * The loop, registering itself so `cancel` can interrupt it.
     *
     * Shared by `run` and `start` on purpose: `cancel` should not care which of the
     * two began the run.
     */
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
      cursor: () => readCursor(),
      run: (mode) => loop(mode),
      start: (mode) =>
        Effect.gen(function* () {
          // Atomic claim: two callers that both saw "not busy" must not both fork.
          const free = yield* Ref.modify(
            busy,
            (current): readonly [boolean, boolean] =>
              current ? [false, current] : [true, true],
          );
          if (!free) return "already-running" as const;

          // A daemon, not a child of the caller: the run must outlive the fiber
          // that asked for it (a screen that unmounts, a dialog that closes). The
          // layer's own scope is not an option either — `makeService` builds the
          // layer with `Effect.runSync`, which closes that scope immediately.
          yield* loop(mode).pipe(
            Effect.ensuring(Ref.set(busy, false)),
            Effect.forkDaemon,
          );
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
          // boundary, so an in-flight merge or upload chunk settles first. The
          // loop's own finalizer turns this into `cancelled`.
          publishNow({
            ...latest,
            status: "cancelling",
            message: "Membatalkan…",
            finishedAt: null,
          });
          yield* Fiber.interrupt(current);
        }),
      // A `SubscriptionRef.changes` stream already replays the current value, so a
      // pill that mounts in the middle of a run paints immediately.
      state: stateRef.changes,
    };
  }),
);
