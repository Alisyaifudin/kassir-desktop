import { Effect } from "effect";
import { useCallback, useEffect, useRef, useState } from "react";
import { Box, CreditCard, LucideIcon, ReceiptText, Trash2, ArrowRightLeft } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/Spinner";
import { TextError } from "~/components/TextError";
import { Progress, ProgressIndeterminate } from "~/components/ui/progress";
import { sync } from "~/lib/sync";
import { db } from "~/database";
import { store } from "~/store";
import { log } from "~/lib/log";

// ── Types ───────────────────────────────────────────────────────────────

type EntityId = "grave" | "product" | "product-event" | "method" | "record";
type EntityStatus = "waiting" | "syncing" | "done" | "error";

interface EntityProgress {
  status: EntityStatus;
  /** Cumulative items downloaded across all iterations */
  pullDone: number;
  /** Total items to pull (locked on first non-zero /count response) */
  pullTotal: number;
  /** Items pushed so far (cumulative: initialUnsync - currentRemaining) */
  pushDone: number;
  /** Total items to push (locked on first sync call: initial countUnsync) */
  pushTotal: number;
  error: string | null;
}

interface SyncResult {
  grave: EntityProgress;
  product: EntityProgress;
  "product-event": EntityProgress;
  method: EntityProgress;
  record: EntityProgress;
}

const ENTITY_CONFIG: { id: EntityId; label: string; icon: LucideIcon; order: number }[] = [
  { id: "grave", label: "Sampah", icon: Trash2, order: 1 },
  { id: "product", label: "Produk", icon: Box, order: 2 },
  { id: "product-event", label: "Produk Event", icon: ArrowRightLeft, order: 3 },
  { id: "method", label: "Metode", icon: CreditCard, order: 4 },
  { id: "record", label: "Riwayat", icon: ReceiptText, order: 5 },
];

function initialProgress(): EntityProgress {
  return { status: "waiting", pullDone: 0, pullTotal: 0, pushDone: 0, pushTotal: 0, error: null };
}

function initialResult(): SyncResult {
  return {
    grave: initialProgress(),
    product: initialProgress(),
    "product-event": initialProgress(),
    method: initialProgress(),
    record: initialProgress(),
  };
}

// ── Count Unsync Helpers ─────────────────────────────────────────────────

function getUnsyncCount(entity: EntityId) {
  switch (entity) {
    case "grave":
      return Effect.gen(function* () {
        const entries = yield* db.grave.get.all();
        return entries.length;
      });
    case "product":
      return db.product.get.countUnsync();
    case "product-event":
      return db.productEvent.get.countUnsync();
    case "method":
      return db.method.get.unsync().pipe(Effect.map((m) => m.length));
    case "record":
      return db.record.count.unsync();
  }
}

// ── Sync Program ─────────────────────────────────────────────────────────

const LOOP_LIMIT = 1000;

function programFullSync(
  token: string,
  setResult: (fn: (prev: SyncResult) => SyncResult) => void,
  signal: { aborted: boolean },
) {
  return Effect.gen(function* () {
    // ── Grave ──────────────────────────────────────────────────────
    const gravePushTotal = yield* getUnsyncCount("grave");
    setResult((prev) => ({
      ...prev,
      grave: { ...prev.grave, status: "syncing", pushTotal: gravePushTotal },
    }));
    yield* runEntityLoop("grave", token, sync.grave, gravePushTotal, setResult, signal);
    if (signal.aborted) return;

    // ── Product ────────────────────────────────────────────────────
    const productPushTotal = yield* getUnsyncCount("product");
    setResult((prev) => ({
      ...prev,
      product: { ...prev.product, status: "syncing", pushTotal: productPushTotal },
    }));
    yield* runEntityLoop("product", token, sync.product, productPushTotal, setResult, signal);
    if (signal.aborted) return;

    // ── Product Event ──────────────────────────────────────────────
    const pePushTotal = yield* getUnsyncCount("product-event");
    setResult((prev) => ({
      ...prev,
      "product-event": { ...prev["product-event"], status: "syncing", pushTotal: pePushTotal },
    }));
    yield* runTwoPhase("product-event", token, sync.productEvent, pePushTotal, setResult, signal);
    if (signal.aborted) return;

    // ── Method ─────────────────────────────────────────────────────
    const methodPushTotal = yield* getUnsyncCount("method");
    setResult((prev) => ({
      ...prev,
      method: { ...prev.method, status: "syncing", pushTotal: methodPushTotal },
    }));
    yield* runEntityLoop("method", token, sync.method, methodPushTotal, setResult, signal);
    if (signal.aborted) return;

    // ── Record ─────────────────────────────────────────────────────
    const recordPushTotal = yield* getUnsyncCount("record");
    setResult((prev) => ({
      ...prev,
      record: { ...prev.record, status: "syncing", pushTotal: recordPushTotal },
    }));
    yield* runEntityLoop("record", token, sync.record, recordPushTotal, setResult, signal);
  });
}

function runEntityLoop(
  entity: EntityId,
  token: string,
  syncFn: (
    token: string,
    stop: { pull: boolean; push: boolean },
  ) => Effect.Effect<{ unsync: number; server: number; total: number }, string>,
  /** Total unsync items before sync starts (locked, for push progress bar) */
  initialUnsync: number,
  setResult: (fn: (prev: SyncResult) => SyncResult) => void,
  signal: { aborted: boolean },
) {
  return Effect.gen(function* () {
    const stop = { pull: false, push: false };
    let lockedPullTotal: number | null = null;

    for (let i = 0; i < LOOP_LIMIT; i++) {
      if (signal.aborted) return;

      const count = yield* syncFn(token, stop).pipe(
        Effect.catchAll((e) => {
          log.error(`[sync:${entity}] ${e}`);
          setResult((prev) => ({
            ...prev,
            [entity]: { ...prev[entity], status: "error", error: e },
          }));
          return Effect.fail(e);
        }),
      );

      if (signal.aborted) return;

      // Lock pull total on first non-zero value — never overwrite
      if (lockedPullTotal === null && count.total > 0) {
        lockedPullTotal = count.total;
      }

      stop.pull = count.server === 0;
      stop.push = count.unsync === 0;

      if (count.server === 0 && count.unsync === 0) {
        // Done
        setResult((prev) => {
          const cur = prev[entity];
          return {
            ...prev,
            [entity]: {
              ...cur,
              status: "done",
              pullDone: cur.pullDone,
              pullTotal: lockedPullTotal ?? cur.pullTotal,
              pushDone: initialUnsync,
              pushTotal: initialUnsync,
            },
          };
        });
        break;
      }

      // Update progress:
      //   pullDone = cumulative server items
      //   pushDone = initialUnsync - remaining (so the bar fills as remaining decreases)
      setResult((prev) => {
        const cur = prev[entity];
        const pushDone = Math.max(0, initialUnsync - count.unsync);
        return {
          ...prev,
          [entity]: {
            ...cur,
            status: "syncing",
            pullDone: cur.pullDone + count.server,
            pullTotal: lockedPullTotal ?? 0,
            pushDone,
            pushTotal: initialUnsync,
          },
        };
      });
    }
  });
}

// ── Two-Phase Sync (pull loop → push) ───────────────────────────────────

function runTwoPhase(
  entity: EntityId,
  token: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  module: {
    pullBatch: (token: string) => Effect.Effect<{ server: number; total: number }, any>;
    pushAll: (token: string) => Effect.Effect<number, any>;
  },
  initialUnsync: number,
  setResult: (fn: (prev: SyncResult) => SyncResult) => void,
  signal: { aborted: boolean },
) {
  return Effect.gen(function* () {
    // ── Phase 1: Pull loop ───────────────────────────────────────
    let lockedPullTotal: number | null = null;
    for (let i = 0; i < LOOP_LIMIT; i++) {
      if (signal.aborted) return;

      const count = yield* module.pullBatch(token).pipe(
        Effect.catchAll((e: unknown) => {
          const msg =
            typeof e === "string"
              ? e
              : String(
                  (e as Record<string, unknown>)?.message ??
                    (e as Record<string, unknown>)?.msg ??
                    e,
                );
          log.error(`[sync:${entity}] pull error: ${msg}`);
          setResult((prev) => ({
            ...prev,
            [entity]: { ...prev[entity], status: "error", error: msg },
          }));
          return Effect.fail(e);
        }),
      );

      if (signal.aborted) return;

      if (lockedPullTotal === null && count.total > 0) {
        lockedPullTotal = count.total;
      }

      setResult((prev) => {
        const cur = prev[entity];
        return {
          ...prev,
          [entity]: {
            ...cur,
            status: "syncing",
            pullDone: cur.pullDone + count.server,
            pullTotal: lockedPullTotal ?? 0,
          },
        };
      });

      if (count.server === 0) break;
    }

    if (signal.aborted) return;

    // ── Phase 2: Push ────────────────────────────────────────────
    if (initialUnsync === 0) {
      // Nothing to push, mark done
      setResult((prev) => {
        const cur = prev[entity];
        return {
          ...prev,
          [entity]: {
            ...cur,
            status: "done",
            pushDone: 0,
            pushTotal: 0,
          },
        };
      });
      return;
    }

    for (let i = 0; i < LOOP_LIMIT; i++) {
      if (signal.aborted) return;

      const remaining = yield* module.pushAll(token).pipe(
        Effect.catchAll((e: unknown) => {
          const msg =
            typeof e === "string"
              ? e
              : String(
                  (e as Record<string, unknown>)?.message ??
                    (e as Record<string, unknown>)?.msg ??
                    e,
                );
          log.error(`[sync:${entity}] push error: ${msg}`);
          setResult((prev) => ({
            ...prev,
            [entity]: { ...prev[entity], status: "error", error: msg },
          }));
          return Effect.fail(e);
        }),
      );

      if (signal.aborted) return;

      const pushDone = Math.max(0, initialUnsync - remaining);
      setResult((prev) => {
        const cur = prev[entity];
        return {
          ...prev,
          [entity]: {
            ...cur,
            status: "syncing",
            pushDone,
            pushTotal: initialUnsync,
          },
        };
      });

      if (remaining === 0) {
        setResult((prev) => {
          const cur = prev[entity];
          return {
            ...prev,
            [entity]: {
              ...cur,
              status: "done",
              pushDone: initialUnsync,
              pushTotal: initialUnsync,
            },
          };
        });
        break;
      }
    }
  });
}

// ── Reset Program ────────────────────────────────────────────────────────

function programResync(setResult: (fn: (prev: SyncResult) => SyncResult) => void) {
  return Effect.gen(function* () {
    setResult(() => initialResult());
    yield* Effect.all(
      [
        store.sync.grave.set(0),
        store.sync.product.set(0),
        store.sync.productEvent.set(0),
        store.sync.productEvent.pushAt.set(0),
        store.sync.method.set(0),
        store.sync.record.set(0),
      ],
      { concurrency: "unbounded" },
    );
    yield* Effect.all(
      [
        db.product.update.unsyncAll(),
        db.productEvent.update.unsyncAll(),
        db.record.update.unsyncAll(),
        db.method.update.unsyncAll(),
      ],
      { concurrency: "unbounded" },
    );
  }).pipe(
    Effect.catchAll((e) => {
      const msg = e instanceof Error ? e.message : String(e?.e ?? e);
      log.error(msg);
      return Effect.fail(msg);
    }),
  );
}

// ── Component ────────────────────────────────────────────────────────────

type Phase = "idle" | "syncing" | "complete" | "error";

export function UnifiedSync({ token }: { token: string }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<SyncResult>(initialResult);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const signalRef = useRef({ aborted: false });

  const runSync = useCallback(
    async (resync: boolean) => {
      signalRef.current = { aborted: false };
      setPhase("syncing");
      setGlobalError(null);

      if (resync) {
        const resetResult = await Effect.runPromise(programResync(setResult).pipe(Effect.either));
        if (resetResult._tag === "Left") {
          setGlobalError(resetResult.left);
          setPhase("error");
          return;
        }
      } else {
        setResult(initialResult());
      }

      const res = await Effect.runPromise(
        programFullSync(token, setResult, signalRef.current).pipe(Effect.either),
      );

      if (res._tag === "Left") {
        const msg =
          typeof res.left === "string"
            ? res.left
            : String((res.left as Record<string, unknown>)?.e ?? res.left);
        log.error(`[sync:global] ${msg}`);
        setGlobalError(msg);
        setPhase("error");
      } else {
        setPhase("complete");
      }
    },
    [token],
  );

  const handleSync = useCallback(() => runSync(false), [runSync]);
  const handleResync = useCallback(() => runSync(true), [runSync]);

  const isRunning = phase === "syncing";
  const isDone = phase === "complete" || phase === "error";

  useEffect(() => {
    return () => {
      signalRef.current.aborted = true;
    };
  }, []);

  return (
    <div className="flex flex-col gap-4">
      {/* Buttons */}
      <div className="flex items-center gap-2">
        <Button disabled={isRunning} onClick={handleSync} className="min-w-[160px]">
          <Spinner when={isRunning} />
          {isRunning ? "Menyinkronkan..." : "Sinkronisasi"}
        </Button>
        <Button
          disabled={isRunning}
          onClick={handleResync}
          variant="destructive"
          className="min-w-[160px]"
        >
          Sinkronisasi Ulang
        </Button>
      </div>

      {globalError && <TextError>{globalError}</TextError>}

      {/* Entity rows */}
      {(isRunning || isDone) && (
        <ul className="flex flex-col divide-y rounded-xl border overflow-hidden">
          {ENTITY_CONFIG.map(({ id, label, icon: Icon }) => (
            <EntityRow key={id} label={label} icon={Icon} progress={result[id]} />
          ))}
        </ul>
      )}

      {/* Summary */}
      {isDone && <SyncSummary result={result} />}
    </div>
  );
}

// ── Entity Row ───────────────────────────────────────────────────────────

function EntityRow({
  label,
  icon: Icon,
  progress,
}: {
  label: string;
  icon: LucideIcon;
  progress: EntityProgress;
}) {
  const { status, pullDone, pullTotal, pushDone, pushTotal, error } = progress;

  const statusContent = () => {
    switch (status) {
      case "waiting":
        return <span className="text-muted-foreground text-small">Menunggu...</span>;
      case "syncing":
        return (
          <div className="flex flex-col gap-2 flex-1 min-w-0 py-0.5">
            {/* Pull bar */}
            <PullBar done={pullDone} total={pullTotal} />
            {/* Push bar */}
            <PushBar done={pushDone} total={pushTotal} />
          </div>
        );
      case "done":
        return (
          <span className="text-small text-emerald-600 font-medium">
            ✓ Unduh {pullDone}, Unggah {pushTotal}
          </span>
        );
      case "error":
        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-small text-destructive font-medium">✗ Gagal</span>
            {error && (
              <span className="text-muted-foreground text-small leading-tight">{error}</span>
            )}
          </div>
        );
    }
  };

  return (
    <li className="flex items-start gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors">
      <Icon className="size-4 text-muted-foreground shrink-0 mt-0.5" />
      <span className="text-normal font-medium w-28 shrink-0 leading-6">{label}</span>
      <div className="flex-1 min-w-0">{statusContent()}</div>
    </li>
  );
}

// ── Pull Bar ─────────────────────────────────────────────────────────────

function PullBar({ done, total }: { done: number; total: number }) {
  const hasTotal = total > 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-small text-muted-foreground  shrink-0">Unduh</span>
      <div className="flex-1 min-w-0">
        {hasTotal ? <Progress value={done} max={total} /> : <ProgressIndeterminate />}
      </div>
      <span className="text-small text-muted-foreground  shrink-0 text-right tabular-nums">
        {hasTotal ? `${done}/${total}` : "..."}
      </span>
    </div>
  );
}

// ── Push Bar ─────────────────────────────────────────────────────────────

function PushBar({ done, total }: { done: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-small text-muted-foreground shrink-0">Unggah</span>
      <div className="flex-1 min-w-0">
        {total > 0 ? (
          <Progress value={done} max={total} />
        ) : (
          <div className="h-2 w-full rounded-full bg-muted/50" />
        )}
      </div>
      <span className="text-small text-muted-foreground shrink-0 text-right tabular-nums">
        {total > 0 ? `${done}/${total}` : "..."}
      </span>
    </div>
  );
}

// ── Summary ──────────────────────────────────────────────────────────────

function SyncSummary({ result }: { result: SyncResult }) {
  return (
    <div className="rounded-xl border bg-muted/30 p-4">
      <h3 className="text-normal font-bold mb-3">Hasil Sinkronisasi</h3>
      <div className="grid grid-cols-3 gap-2 text-small">
        <div className="text-muted-foreground font-medium">Entitas</div>
        <div className="text-muted-foreground font-medium text-right">Unduh</div>
        <div className="text-muted-foreground font-medium text-right">Unggah</div>
        {ENTITY_CONFIG.map(({ id, label }) => {
          const r = result[id];
          return (
            <>
              <div key={`${id}-label`} className="flex items-center gap-1.5">
                {r.status === "error" ? (
                  <span className="text-destructive">✗</span>
                ) : (
                  <span className="text-emerald-600">✓</span>
                )}
                <span>{label}</span>
              </div>
              <div key={`${id}-pull`} className="text-right tabular-nums">
                {r.pullDone}
              </div>
              <div key={`${id}-push`} className="text-right tabular-nums">
                {r.pushTotal}
              </div>
            </>
          );
        })}
      </div>
    </div>
  );
}
