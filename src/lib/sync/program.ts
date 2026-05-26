import { Effect } from "effect";
import { sync } from "./index";
import { db } from "~/database";
import { store } from "~/store";
import { log } from "~/lib/log";
import {
  RequestError,
  ResponseError,
  BodyError,
  ZodSchemaError,
  NotFound,
} from "~/lib/effect-error";
import { DbError } from "~/database/instance";
import { StoreError } from "~/store/error";
import {
  syncAtom,
  syncSignal,
  initialSyncState,
  ENTITY_CONFIG,
  type EntityId,
  type SyncResult,
} from "./atom";

export type SyncError = RequestError | ResponseError | BodyError | ZodSchemaError | NotFound | DbError | StoreError | string;

// ── Helpers ──────────────────────────────────────────────────────────────

export function errorMessage(e: SyncError): string {
  if (typeof e === "string") return e;
  switch (e._tag) {
    case "DbError":
    case "StoreError":
      return e.e.message;
    case "RequestError":
      return String(e.error);
    case "ResponseError":
      return `HTTP ${e.response.status}`;
    case "NotFound":
      return e.msg;
    case "BodyError":
      return String(e.error);
    case "ZodSchemaError":
      return e.error.issues.map((i) => i.message).join("; ");
  }
}

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

function setActiveEntity(entityId: EntityId) {
  const cfg = ENTITY_CONFIG.find((e) => e.id === entityId);
  syncAtom.set((prev) => ({
    ...prev,
    activeEntity: cfg ? { id: cfg.id, label: cfg.label, icon: cfg.icon } : null,
  }));
}

// ── Sync Programs ────────────────────────────────────────────────────────

const LOOP_LIMIT = 1000;

function programFullSync(token: string) {
  return Effect.gen(function* () {
    // ── Grave ──────────────────────────────────────────────────────
    setActiveEntity("grave");
    const gravePushTotal = yield* getUnsyncCount("grave");
    syncAtom.set((prev) => ({ ...prev, ...entityStart(prev.result, "grave", gravePushTotal) }));
    yield* runEntityLoop("grave", token, sync.grave, gravePushTotal);
    if (syncSignal.aborted) return;

    // ── Product ────────────────────────────────────────────────────
    setActiveEntity("product");
    const productPushTotal = yield* getUnsyncCount("product");
    syncAtom.set((prev) => ({ ...prev, ...entityStart(prev.result, "product", productPushTotal) }));
    yield* runEntityLoop("product", token, sync.product, productPushTotal);
    if (syncSignal.aborted) return;

    // ── Product Event ──────────────────────────────────────────────
    setActiveEntity("product-event");
    const pePushTotal = yield* getUnsyncCount("product-event");
    syncAtom.set((prev) => ({ ...prev, ...entityStart(prev.result, "product-event", pePushTotal) }));
    yield* runTwoPhase("product-event", token, sync.productEvent, pePushTotal);
    if (syncSignal.aborted) return;

    // ── Method ─────────────────────────────────────────────────────
    setActiveEntity("method");
    const methodPushTotal = yield* getUnsyncCount("method");
    syncAtom.set((prev) => ({ ...prev, ...entityStart(prev.result, "method", methodPushTotal) }));
    yield* runEntityLoop("method", token, sync.method, methodPushTotal);
    if (syncSignal.aborted) return;

    // ── Record ─────────────────────────────────────────────────────
    setActiveEntity("record");
    const recordPushTotal = yield* getUnsyncCount("record");
    syncAtom.set((prev) => ({ ...prev, ...entityStart(prev.result, "record", recordPushTotal) }));
    yield* runEntityLoop("record", token, sync.record, recordPushTotal);
  });
}

function entityStart(result: SyncResult, entity: EntityId, pushTotal: number) {
  return {
    result: {
      ...result,
      [entity]: { ...result[entity], status: "syncing" as const, pushTotal },
    },
  };
}

// ── Entity Loop (original: combined pull+push in one iteration) ──────────

function runEntityLoop(
  entity: EntityId,
  token: string,
  syncFn: (
    token: string,
    stop: { pull: boolean; push: boolean },
  ) => Effect.Effect<{ unsync: number; server: number; total: number }, string>,
  initialUnsync: number,
) {
  return Effect.gen(function* () {
    const stop = { pull: false, push: false };
    let lockedPullTotal: number | null = null;

    for (let i = 0; i < LOOP_LIMIT; i++) {
      if (syncSignal.aborted) return;

      const count = yield* syncFn(token, stop).pipe(
        Effect.catchAll((e) => {
          const msg = typeof e === "string" ? e : String(e);
          log.error(`[sync:${entity}] ${msg}`);
          syncAtom.set((prev) => ({
            ...prev,
            result: {
              ...prev.result,
              [entity]: { ...prev.result[entity], status: "error", error: msg },
            },
          }));
          return Effect.fail(e);
        }),
      );

      if (syncSignal.aborted) return;

      if (lockedPullTotal === null && count.total > 0) {
        lockedPullTotal = count.total;
      }

      stop.pull = count.server === 0;
      stop.push = count.unsync === 0;

      if (count.server === 0 && count.unsync === 0) {
        syncAtom.set((prev) => ({
          ...prev,
          result: {
            ...prev.result,
            [entity]: {
              ...prev.result[entity],
              status: "done",
              pullDone: prev.result[entity].pullDone,
              pullTotal: lockedPullTotal ?? prev.result[entity].pullTotal,
              pushDone: initialUnsync,
              pushTotal: initialUnsync,
            },
          },
        }));
        break;
      }

      const pushDone = Math.max(0, initialUnsync - count.unsync);
      syncAtom.set((prev) => ({
        ...prev,
        result: {
          ...prev.result,
          [entity]: {
            ...prev.result[entity],
            status: "syncing",
            pullDone: prev.result[entity].pullDone + count.server,
            pullTotal: lockedPullTotal ?? 0,
            pushDone,
            pushTotal: initialUnsync,
          },
        },
      }));
    }
  });
}

// ── Two-Phase (pull loop → push) ─────────────────────────────────────────

function runTwoPhase(
  entity: EntityId,
  token: string,
  module: {
    pullBatch: (token: string) => Effect.Effect<{ server: number; total: number }, SyncError>;
    pushAll: (token: string) => Effect.Effect<number, SyncError>;
  },
  initialUnsync: number,
) {
  return Effect.gen(function* () {
    // ── Pull loop ────────────────────────────────────────────────
    let lockedPullTotal: number | null = null;
    for (let i = 0; i < LOOP_LIMIT; i++) {
      if (syncSignal.aborted) return;

      const count = yield* module.pullBatch(token).pipe(
        Effect.catchAll((e: SyncError) => {
          const msg = errorMessage(e);
          log.error(`[sync:${entity}] pull error: ${msg}`);
          syncAtom.set((prev) => ({
            ...prev,
            result: {
              ...prev.result,
              [entity]: { ...prev.result[entity], status: "error", error: msg },
            },
          }));
          return Effect.fail(e);
        }),
      );

      if (syncSignal.aborted) return;

      if (lockedPullTotal === null && count.total > 0) {
        lockedPullTotal = count.total;
      }

      syncAtom.set((prev) => ({
        ...prev,
        result: {
          ...prev.result,
          [entity]: {
            ...prev.result[entity],
            status: "syncing",
            pullDone: prev.result[entity].pullDone + count.server,
            pullTotal: lockedPullTotal ?? 0,
          },
        },
      }));

      if (count.server === 0) break;
    }

    if (syncSignal.aborted) return;

    // ── Push ─────────────────────────────────────────────────────
    if (initialUnsync === 0) {
      syncAtom.set((prev) => ({
        ...prev,
        result: {
          ...prev.result,
          [entity]: {
            ...prev.result[entity],
            status: "done",
            pushDone: 0,
            pushTotal: 0,
          },
        },
      }));
      return;
    }

    for (let i = 0; i < LOOP_LIMIT; i++) {
      if (syncSignal.aborted) return;

      const remaining = yield* module.pushAll(token).pipe(
        Effect.catchAll((e: SyncError) => {
          const msg = errorMessage(e);
          log.error(`[sync:${entity}] push error: ${msg}`);
          syncAtom.set((prev) => ({
            ...prev,
            result: {
              ...prev.result,
              [entity]: { ...prev.result[entity], status: "error", error: msg },
            },
          }));
          return Effect.fail(e);
        }),
      );

      if (syncSignal.aborted) return;

      const pushDone = Math.max(0, initialUnsync - remaining);
      syncAtom.set((prev) => ({
        ...prev,
        result: {
          ...prev.result,
          [entity]: {
            ...prev.result[entity],
            status: "syncing",
            pushDone,
            pushTotal: initialUnsync,
          },
        },
      }));

      if (remaining === 0) {
        syncAtom.set((prev) => ({
          ...prev,
          result: {
            ...prev.result,
            [entity]: {
              ...prev.result[entity],
              status: "done",
              pushDone: initialUnsync,
              pushTotal: initialUnsync,
            },
          },
        }));
        break;
      }
    }
  });
}

// ── Public API ───────────────────────────────────────────────────────────

export async function startSync(token: string) {
  syncSignal.aborted = false;
  syncAtom.set({
    ...initialSyncState(),
    phase: "syncing",
  });

  await runFullSync(token);
}

export async function startResync(token: string) {
  syncSignal.aborted = false;
  syncAtom.set({
    ...initialSyncState(),
    phase: "syncing",
  });

  const res = await Effect.runPromise(programResync().pipe(Effect.either));
  if (res._tag === "Left") {
    syncAtom.set((prev) => ({
      ...prev,
      phase: "error",
      globalError: errorMessage(res.left as SyncError),
    }));
    return;
  }

  await runFullSync(token);
}

async function runFullSync(token: string) {
  await Effect.runPromise(programFullSync(token).pipe(Effect.either));
  syncAtom.set((prev) => ({
    ...prev,
    phase: prev.phase === "syncing"
      ? (syncSignal.aborted ? "aborted" : "complete")
      : prev.phase,
  }));
}

export function abortSync() {
  syncSignal.aborted = true;
}

// ── Resync helper ────────────────────────────────────────────────────────

function programResync() {
  return Effect.gen(function* () {
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
