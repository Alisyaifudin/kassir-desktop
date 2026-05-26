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
type EntityStatus = "waiting" | "pulling" | "pushing" | "done" | "error";

interface EntityProgress {
  status: EntityStatus;
  pullDone: number;
  pullTotal: number;
  pushDone: number;
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

// ── Sync Program ─────────────────────────────────────────────────────────

const LOOP_LIMIT = 1000;

function programFullSync(
  token: string,
  setResult: (fn: (prev: SyncResult) => SyncResult) => void,
  signal: { aborted: boolean },
) {
  return Effect.gen(function* () {
    // ── Grave ──────────────────────────────────────────────────────
    setResult((prev) => ({ ...prev, grave: { ...prev.grave, status: "pulling" } }));
    yield* runEntityLoop("grave", token, sync.grave, setResult, signal);
    if (signal.aborted) return;

    // ── Product ────────────────────────────────────────────────────
    setResult((prev) => ({ ...prev, product: { ...prev.product, status: "pulling" } }));
    yield* runEntityLoop("product", token, sync.product, setResult, signal);
    if (signal.aborted) return;

    // ── Product Event ──────────────────────────────────────────────
    setResult((prev) => ({
      ...prev,
      "product-event": { ...prev["product-event"], status: "pulling" },
    }));
    yield* runEntityLoop("product-event", token, sync.productEvent, setResult, signal);
    if (signal.aborted) return;

    // ── Method ─────────────────────────────────────────────────────
    setResult((prev) => ({ ...prev, method: { ...prev.method, status: "pulling" } }));
    yield* runEntityLoop("method", token, sync.method, setResult, signal);
    if (signal.aborted) return;

    // ── Record ─────────────────────────────────────────────────────
    setResult((prev) => ({ ...prev, record: { ...prev.record, status: "pulling" } }));
    yield* runEntityLoop("record", token, sync.record, setResult, signal);
  });
}

function runEntityLoop(
  entity: EntityId,
  token: string,
  syncFn: (
    token: string,
    stop: { pull: boolean; push: boolean },
  ) => Effect.Effect<{ unsync: number; server: number; total: number }, string>,
  setResult: (fn: (prev: SyncResult) => SyncResult) => void,
  signal: { aborted: boolean },
) {
  return Effect.gen(function* () {
    const stop = { pull: false, push: false };

    for (let i = 0; i < LOOP_LIMIT; i++) {
      if (signal.aborted) return;

      const count = yield* syncFn(token, stop).pipe(
        Effect.catchAll((e) => {
          setResult((prev) => ({
            ...prev,
            [entity]: { ...prev[entity], status: "error", error: e },
          }));
          return Effect.fail(e);
        }),
      );

      if (signal.aborted) return;

      stop.pull = count.server === 0;
      stop.push = count.unsync === 0;

      // Determine phase: if pull not stopped yet, we're pulling; otherwise pushing
      const phase: EntityStatus = !stop.pull ? "pulling" : !stop.push ? "pushing" : "done";

      if (phase === "pulling" || phase === "done") {
        // Accumulate pull progress
        setResult((prev) => {
          const cur = prev[entity];
          const total = count.total > 0 ? count.total : cur.pullTotal;
          return {
            ...prev,
            [entity]: {
              ...cur,
              status: phase,
              pullDone: count.server > 0 ? cur.pullDone + count.server : cur.pullDone,
              pullTotal: total,
              pushTotal: count.unsync,
              pushDone: 0,
            },
          };
        });
      }

      if (phase === "pushing") {
        setResult((prev) => ({
          ...prev,
          [entity]: {
            ...prev[entity],
            status: "pushing",
            pushTotal: count.unsync,
            pushDone: 0,
          },
        }));
      }

      if (phase === "done") {
        setResult((prev) => {
          // Retain the final accumulated counts but mark done
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
      log.error(e.e ?? e);
      return Effect.fail(e.e?.message ?? String(e));
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
        const resetResult = await Effect.runPromise(
          programResync(setResult).pipe(Effect.either),
        );
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
        setGlobalError(res.left);
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

  // Cleanup on unmount
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

      {/* Entity rows — visible during sync and after */}
      {(isRunning || isDone) && (
        <ul className="flex flex-col divide-y rounded-xl border overflow-hidden">
          {ENTITY_CONFIG.map(({ id, label, icon: Icon }) => (
            <EntityRow key={id} label={label} icon={Icon} progress={result[id]} />
          ))}
        </ul>
      )}

      {/* Summary — after all complete */}
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
  const { status, pullDone, pullTotal, pushTotal, error } = progress;

  const statusIcon = () => {
    switch (status) {
      case "waiting":
        return <span className="text-muted-foreground text-small">Menunggu...</span>;
      case "pulling":
        return (
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <span className="text-small text-muted-foreground">
              Unduh {pullTotal > 0 ? `${pullDone}/${pullTotal}` : "..."}
            </span>
            {pullTotal > 0 ? (
              <Progress value={pullDone} max={pullTotal} />
            ) : (
              <ProgressIndeterminate />
            )}
          </div>
        );
      case "pushing":
        return (
          <div className="flex items-center gap-1.5">
            <Spinner when />
            <span className="text-small text-muted-foreground">
              Unggah {pushTotal > 0 ? pushTotal : ""}
            </span>
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
    <li className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
      <Icon className="size-4 text-muted-foreground shrink-0" />
      <span className="text-normal font-medium w-32 shrink-0">{label}</span>
      <div className="flex-1 min-w-0">{statusIcon()}</div>
    </li>
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
