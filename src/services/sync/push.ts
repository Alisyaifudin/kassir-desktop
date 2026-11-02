/**
 * Push → acknowledge (§7).
 *
 * One batch is a list of bare row frames, **every pocket before any money row**,
 * at most 1000 frames — a fresh request with no session, no upload id and no
 * offset (§7.1 "state: none"). Each frame is idempotent in both directions, so a
 * failed batch is simply sent again whole (§7.5).
 *
 * The ack is where `*_sync_at` finally moves: the server's `seq` becomes the
 * row's marker, which is what takes it out of the next batch. A `stale` ack
 * carries the server's winning row, which is merged immediately (merge point C)
 * so this device repairs itself instead of waiting for the next pull.
 */
import { Context, Effect } from "effect";
import type { DatabaseService } from "../db";
import { log } from "~/lib/log";
import { SyncError } from ".";
import { type AckFrame, encodeRowFrame, parseLine, parsePushFrame } from "./frames";
import { staleStatement, type MergeExecutor } from "./merge";
import { toSyncError } from "./pull";
import { TABLES, clockOf, idOf, toCanonicalRow, type Entity, type WireRow } from "./schema";
import { countUnsyncedSql, markSyncedStatement, selectUnsyncedSql } from "./sql";
import { consumeLines, type Endpoint, type MergeStatement, type SyncTransport } from "./transport";

type DatabaseServiceImpl = Context.Tag.Service<typeof DatabaseService>;

/** The server's batch bound (§7.1). */
export const MAX_FRAMES_PER_BATCH = 1000;
/** Passes over the unsync set, for writes that land while a push runs. */
const MAX_PASSES = 5;
/** Attempts at one batch: the contract's "retry the same batch with backoff". */
const MAX_ATTEMPTS = 3;

/** One encoded row, ready to send and to match an ack against. */
export type Frame = {
  entity: Entity;
  id: string;
  /** The clock this device uploaded — the guard for a `stale` merge. */
  updatedAt: number;
  line: string;
};

export type PushDeps = {
  db: DatabaseServiceImpl;
  transport: SyncTransport;
  endpoint: Endpoint;
  execute: MergeExecutor;
  onProgress?: (progress: { entity: Entity | null; done: number; total: number }) => void;
};

export type PushOutcome = {
  /** Frames the server acknowledged, whatever the outcome. */
  pushed: number;
  /** Frames the server's copy won. */
  stale: number;
};

/** Reads the next batch: pockets first, then the money rows, up to the bound. */
function readBatch(db: DatabaseServiceImpl): Effect.Effect<Frame[], SyncError> {
  return Effect.gen(function* () {
    const frames: Frame[] = [];
    for (const def of [TABLES.pocket, TABLES.money]) {
      const remaining = MAX_FRAMES_PER_BATCH - frames.length;
      if (remaining <= 0) break;
      const rows = yield* db
        .selectMany<Record<string, unknown>>(selectUnsyncedSql(def, remaining))
        .pipe(
          Effect.mapError(
            (error) =>
              new SyncError({
                message: `Sinkronisasi ${def.entity} gagal dibaca: ${error.message}`,
              }),
          ),
        );
      for (const raw of rows) {
        const row = toCanonicalRow(def, raw);
        frames.push({
          entity: def.entity,
          id: idOf(def, row),
          updatedAt: clockOf(def, row),
          line: encodeRowFrame(def.entity, row),
        });
      }
    }
    return frames;
  });
}

/**
 * How many rows this device owes the server right now.
 *
 * Read once per push so the progress bar has a denominator that does not move
 * with every batch: a total recomputed per batch makes the bar jump around, and
 * the user reads that as going backwards.
 */
function countUnsynced(db: DatabaseServiceImpl): Effect.Effect<number, SyncError> {
  return Effect.gen(function* () {
    let total = 0;
    for (const def of [TABLES.pocket, TABLES.money]) {
      const rows = yield* db.selectMany<{ total: number }>(countUnsyncedSql(def)).pipe(
        Effect.mapError(
          (error) =>
            new SyncError({
              message: `Sinkronisasi ${def.entity} gagal dibaca: ${error.message}`,
            }),
        ),
      );
      total += rows[0]?.total ?? 0;
    }
    return total;
  });
}

/** True when the failure is worth re-sending the same batch for (§7.6). */
export function isRetryable(error: SyncError): boolean {
  return error.status === 0 || (error.status ?? 0) >= 500;
}

type Acks = { acks: AckFrame[] };

/**
 * Posts one batch and collects the ack stream.
 *
 * Collecting first and writing second keeps every `*_sync_at` update in Effect
 * land and keeps an interrupted fiber from leaving a half-applied ack batch.
 */
function postBatch(deps: PushDeps, frames: readonly Frame[]): Effect.Effect<Acks, SyncError> {
  return Effect.gen(function* () {
    const body = `${frames.map((frame) => frame.line).join("\n")}\n`;
    const stream = deps.transport.push(deps.endpoint, { body });

    const acks: AckFrame[] = [];
    yield* Effect.tryPromise({
      try: () =>
        consumeLines(stream, (line) => {
          const frame = parsePushFrame(parseLine(line));
          if (frame.t === "ack") acks.push(frame);
        }),
      catch: toSyncError,
    }).pipe(Effect.onInterrupt(() => Effect.sync(() => stream.cancel())));

    return { acks };
  });
}

/** Posts one batch, retrying a transport/5xx failure with backoff. */
function postWithRetry(deps: PushDeps, frames: readonly Frame[]): Effect.Effect<Acks, SyncError> {
  const attempt = (remaining: number): Effect.Effect<Acks, SyncError> =>
    postBatch(deps, frames).pipe(
      Effect.catchAll((error) => {
        if (remaining <= 1 || !isRetryable(error)) return Effect.fail(error);
        log.info(`sync: push retry after "${error.code ?? "transport"}": ${error.message}`);
        return Effect.sleep(`${400 * (MAX_ATTEMPTS - remaining + 1)} millis`).pipe(
          Effect.flatMap(() => attempt(remaining - 1)),
        );
      }),
    );
  return attempt(MAX_ATTEMPTS);
}

/**
 * Applies one batch's acks: markers for `applied`/`noop`, the server's row for
 * `stale`, all in one transaction.
 *
 * An ack whose index has no frame is a server/client disagreement about the
 * batch; the frame cannot be identified, so it is dropped rather than marking the
 * wrong row as sent.
 */
function applyAcks(
  deps: PushDeps,
  frames: readonly Frame[],
  acks: readonly AckFrame[],
): Effect.Effect<{ pushed: number; stale: number }, SyncError> {
  return Effect.gen(function* () {
    const statements: MergeStatement[] = [];
    let stale = 0;
    let pushed = 0;

    for (const ack of acks) {
      const frame = frames[ack.i];
      if (frame === undefined) continue;
      pushed += 1;
      const def = TABLES[ack.e];
      if (ack.s === "stale") {
        stale += 1;
        // The server's copy is the truth; overwrite it unless the local row was
        // edited after this frame left (`since` = the clock we uploaded).
        statements.push(staleStatement(ack.e, ack.row as WireRow, ack.seq, frame.updatedAt));
        continue;
      }
      statements.push(markSyncedStatement(def, frame.id, ack.seq, frame.updatedAt));
    }

    yield* deps.execute(statements, "push");
    return { pushed, stale };
  });
}

/** Pushes every row this device owes the server, batch by batch (§7.4). */
export function push(deps: PushDeps): Effect.Effect<PushOutcome, SyncError> {
  return Effect.gen(function* () {
    let pushed = 0;
    let stale = 0;
    // One denominator for the whole push, so the bar advances instead of jumping.
    const expected = yield* countUnsynced(deps.db);
    deps.onProgress?.({ entity: null, done: 0, total: expected });

    for (let pass = 0; pass < MAX_PASSES; pass++) {
      const frames = yield* readBatch(deps.db);
      if (frames.length === 0) break;

      deps.onProgress?.({ entity: null, done: pushed, total: Math.max(expected, pushed) });
      const acks = yield* postWithRetry(deps, frames);
      if (acks.acks.length === 0 && frames.length > 0) {
        // A batch with no ack would be re-sent forever; the batch was accepted
        // by nobody, so surface it rather than spinning.
        return yield* Effect.fail(
          new SyncError({
            message: "Server tidak mengonfirmasi data yang dikirim",
            code: "bad_frame",
          }),
        );
      }

      const applied = yield* applyAcks(deps, frames, acks.acks);
      pushed += applied.pushed;
      stale += applied.stale;
      deps.onProgress?.({ entity: null, done: pushed, total: Math.max(expected, pushed) });

      // A local write during the push leaves more rows unsynced; loop again. If
      // the batch changed nothing at all, another pass would spin, so the next
      // iteration reads the batch and breaks on empty.
      if (acks.acks.length < frames.length) break;
    }

    return { pushed, stale };
  });
}
