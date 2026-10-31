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
 * The screen forks `run` and interrupts that fiber when it is left. The
 * interrupt finalizers in `pull.ts`/`push.ts` call `sync_cancel` in Rust, so the
 * HTTP request really stops rather than draining in the background. `cancel` here
 * is the explicit-button version of the same thing.
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
  SyncError,
  SyncService,
  type SyncConfig,
  type SyncMode,
  type SyncProgress,
  type SyncReport,
} from ".";
import { dbFailure, makeMerger, type MergeExecutor } from "./merge";
import { pull, toSyncError } from "./pull";
import { push } from "./push";
import { resetSyncStatements } from "./sql";
import { SyncTransportService } from "./transport";

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

const IDLE: SyncProgress = { phase: "idle", entity: null, done: 0, total: 0, message: "" };

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

    const progressRef = yield* SubscriptionRef.make<SyncProgress>(IDLE);
    // The running fiber, so `cancel` can stop an in-flight request.
    const running = yield* Ref.make<Fiber.RuntimeFiber<SyncReport, SyncError> | null>(null);

    /**
     * Publishes progress. Synchronous on purpose: `pull`/`push` report from inside
     * their loops, and a `SubscriptionRef` update is a plain ref write.
     */
    function publish(progress: SyncProgress): void {
      Effect.runSync(SubscriptionRef.set(progressRef, progress));
    }

    function phase(
      phase: SyncProgress["phase"],
      entity: string | null,
      done: number,
      total: number,
      message: string,
    ): SyncProgress {
      return { phase, entity, done, total, message };
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

    function endpointOf(config: SyncConfig): Effect.Effect<{ baseUrl: string; token: string }, SyncError> {
      const baseUrl = config.baseUrl.trim().replace(/\/+$/, "");
      const token = config.token.trim();
      if (baseUrl === "") {
        return Effect.fail(
          new SyncError({
            message: "Alamat server belum diisi. Isi di Pengaturan → Sinkronisasi.",
            code: "bad_request",
          }),
        );
      }
      if (token === "") {
        return Effect.fail(
          new SyncError({
            message: "Token sinkronisasi belum diisi. Isi di Pengaturan → Sinkronisasi.",
            code: "unauthorized",
            status: 401,
          }),
        );
      }
      return Effect.succeed({ baseUrl, token });
    }

    /** §3.2 `Sinkronisasi Ulang`: cursors to zero, session dropped, all rows queued. */
    function resetLocal(endpoint: { baseUrl: string; token: string }): Effect.Effect<void, SyncError> {
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

    /** The whole loop. `reset` clears the cursors and unsync markers first (§3.2). */
    function execute(mode: SyncMode): Effect.Effect<SyncReport, SyncError> {
      return Effect.gen(function* () {
        const endpoint = yield* endpointOf(yield* getConfig());

        if (mode === "reset") {
          publish(phase("idle", null, 0, 0, "Menyiapkan sinkronisasi ulang…"));
          yield* resetLocal(endpoint);
        }

        // 1. Pull: stream the whole gap. Nothing is written yet.
        publish(phase("pull", null, 0, 0, "Mengunduh perubahan…"));
        const pulled = yield* pull({
          transport,
          endpoint,
          readCursor,
          onProgress: (progress) => {
            publish(
              phase(
                "pull",
                progress.entity,
                progress.done,
                progress.total,
                progress.entity === null
                  ? "Mengunduh perubahan…"
                  : `Mengunduh ${progress.entity}…`,
              ),
            );
          },
        });

        // 2. Merge: one batch, conflict-resolved, then the cursor moves — so a
        //    failure re-pulls the same gap instead of skipping it.
        const merger = makeMerger(db, Date.now(), mergeExecutor);
        const frameCount = pulled.frames.rows.length + pulled.frames.aggregates.length;
        publish(phase("merge", null, 0, frameCount, "Menyimpan hasil unduhan…"));
        const merged = yield* merger.mergeFrames(pulled.frames);
        yield* writeCursor(pulled.lastPulledSeq);
        publish(phase("merge", null, frameCount, frameCount, "Hasil unduhan tersimpan"));
        yield* refreshServices();

        // 3. Push: upload what this device owes the server.
        publish(phase("push", null, 0, 0, "Mengunggah perubahan…"));
        const pushed = yield* push({
          db,
          transport,
          endpoint,
          readUploadId: () =>
            readSession().pipe(Effect.map((session) => session?.uploadId ?? null)),
          writeUploadState: (state) =>
            writeSession(state).pipe(Effect.catchAll(() => Effect.void)),
          clearUploadState: () => clearSession().pipe(Effect.catchAll(() => Effect.void)),
          mergeStaleRow: (entity, row) => merger.mergeStaleRow(entity, row),
          mergeStaleAggregate: (row, children) => merger.mergeStaleAggregate(row, children),
          onProgress: (progress) => {
            publish(
              phase(
                "push",
                progress.entity,
                progress.done,
                progress.total,
                progress.entity === null ? "Mengunggah perubahan…" : `Mengunggah ${progress.entity}…`,
              ),
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
        publish(
          phase(
            "done",
            null,
            merged.merged,
            pushed.pushed,
            `Selesai — ${merged.merged} diunduh, ${pushed.pushed} diunggah`,
          ),
        );
        return {
          lastPulledSeq,
          pulled: merged.merged,
          pushed: pushed.pushed,
          stale: pushed.stale,
        };
      });
    }

    return {
      config: {
        get: () => getConfig(),
        set: (config) =>
          Effect.gen(function* () {
            yield* write(KEY_BASE_URL, config.baseUrl.trim());
            yield* write(KEY_TOKEN, config.token.trim());
          }),
      },
      cursor: () => readCursor(),
      run: (mode) =>
        Effect.withFiberRuntime((fiber) =>
          Effect.gen(function* () {
            yield* Ref.set(running, fiber);
            const report = yield* execute(mode).pipe(
              Effect.catchAll((error) =>
                Effect.gen(function* () {
                  publish(phase("failed", null, 0, 0, error.message));
                  return yield* Effect.fail(error);
                }),
              ),
              Effect.onInterrupt(() =>
                Effect.sync(() => publish(phase("cancelled", null, 0, 0, "Sinkronisasi dibatalkan"))),
              ),
              Effect.ensuring(Ref.set(running, null)),
            );
            return report;
          }),
        ),
      cancel: () =>
        Effect.gen(function* () {
          const current = yield* Ref.get(running);
          if (current !== null) yield* Fiber.interrupt(current);
        }),
      // A `SubscriptionRef.changes` stream already replays the current value, so
      // the screen has something to paint before the first run starts.
      progress: progressRef.changes,
    };
  }),
);
