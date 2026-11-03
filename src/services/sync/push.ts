/**
 * Push → acknowledge (`SYNC-V2.md` §4).
 *
 * One batch is a list of bare frames — rows for the simple groups, one whole
 * aggregate per record — at most the group's frame/byte bound, in the group's
 * dependency order. A fresh request with no session, no upload id and no offset
 * (§4.1 "state: none"). Each frame is idempotent in both directions, so a failed
 * batch is simply sent again whole (§4.5).
 *
 * The ack is where `*_sync_at` finally moves: the server's `seq` becomes the
 * row's marker, which is what takes it out of the next batch. A `stale` ack
 * carries the server's winning row/aggregate, which is merged immediately (merge
 * point C) so this device repairs itself instead of waiting for the next pull.
 * An ack is applied only to the row/record still carrying the clock that was sent
 * (§4.12).
 */
import { Context, Effect } from "effect";
import type { DatabaseService } from "../db";
import { log } from "~/lib/log";
import { SyncError } from ".";
import {
  encodeAggregateFrame,
  encodeRowFrame,
  parseLine,
  parsePushFrame,
  type AckFrame,
} from "./frames";
import { staleStatements, type MergeExecutor } from "./merge";
import { toSyncError } from "./pull";
import { backoffMs, isRetryable } from "./retry";
import {
  GROUPS,
  RECORD_CHILD_TABLES,
  TABLES,
  clockOf,
  emptyChildren,
  idOf,
  toCanonicalChild,
  toCanonicalRow,
  type EntityDef,
  type SyncGroup,
  type WireChildren,
} from "./schema";
import {
  countUnsyncedSql,
  markSyncedStatement,
  selectChildrenSql,
  selectUnsyncedAggregateSql,
  selectUnsyncedSql,
} from "./sql";
import { consumeLines, type Endpoint, type MergeStatement, type SyncTransport } from "./transport";

type DatabaseServiceImpl = Context.Tag.Service<typeof DatabaseService>;

/** Passes over the unsync set, for writes that land while a push runs. */
const MAX_PASSES = 5;
/** Attempts at one batch before the cycle gives up; the next run retries it. */
const MAX_ATTEMPTS = 5;

/** One encoded frame, ready to send and to match an ack against. */
export type Frame = {
  entity: string;
  id: string;
  /** The clock this device uploaded — the guard for an ack (§4.12); `0` for append-only. */
  clock: number;
  /** The NDJSON line, without its terminating newline. */
  line: string;
  /** The record aggregate's children, for a `stale` ack's compare-and-set. */
  children?: WireChildren;
};

export type PushDeps = {
  db: DatabaseServiceImpl;
  transport: SyncTransport;
  endpoint: Endpoint;
  group: SyncGroup;
  execute: MergeExecutor;
  onProgress?: (progress: { entity: string | null; done: number; total: number }) => void;
};

export type PushOutcome = {
  /** Frames the server acknowledged, whatever the outcome. */
  pushed: number;
  /** Frames the server's copy won. */
  stale: number;
};

/** Reads one record's five child sets. */
function readChildren(
  db: DatabaseServiceImpl,
  recordId: string,
): Effect.Effect<WireChildren, SyncError> {
  return Effect.gen(function* () {
    const children = emptyChildren();
    for (const child of RECORD_CHILD_TABLES) {
      const rows = yield* db
        .selectMany<Record<string, unknown>>(selectChildrenSql(child), [recordId])
        .pipe(
          Effect.mapError(
            (error) =>
              new SyncError({
                message: `Sinkronisasi ${child.key} gagal dibaca: ${error.message}`,
              }),
          ),
        );
      children[child.key] = rows.map((row) => toCanonicalChild(child, row));
    }
    return children;
  });
}

function bytesOf(line: string): number {
  // One `\n` per line, and the bound is on the uncompressed body (§4.1, §16.1).
  return new TextEncoder().encode(`${line}\n`).length;
}

/**
 * Reads the next batch: entities in the group's push order, within the frame and
 * byte bounds. A record never splits across frames or requests.
 */
function readBatch(
  db: DatabaseServiceImpl,
  group: SyncGroup,
): Effect.Effect<Frame[], SyncError> {
  return Effect.gen(function* () {
    const def = GROUPS[group];
    const frames: Frame[] = [];
    let bytes = 0;

    const fits = (lineBytes: number): boolean => bytes + lineBytes <= def.pushBytes;

    for (const entity of def.entities) {
      const remaining = def.pushFrames - frames.length;
      if (remaining <= 0) break;

      if (entity.kind === "aggregate") {
        const rows = yield* db
          .selectMany<Record<string, unknown>>(selectUnsyncedAggregateSql(entity, remaining))
          .pipe(
            Effect.mapError(
              (error) =>
                new SyncError({
                  message: `Sinkronisasi ${entity.entity} gagal dibaca: ${error.message}`,
                }),
            ),
          );
        for (const raw of rows) {
          const row = toCanonicalRow(entity, raw);
          const id = idOf(entity, row);
          const children = yield* readChildren(db, id);
          const line = encodeAggregateFrame(row, children);
          const size = bytesOf(line);
          if (!fits(size)) {
            if (frames.length === 0) {
              // A record over the 8 MB push bound cannot be sent at all; surface
              // it rather than silently skipping it (§8.8, §10 not-guaranteed 11).
              return yield* Effect.fail(
                new SyncError({
                  message: `Catatan ${id} terlalu besar untuk disinkronkan (lebih dari 8 MB)`,
                  code: "payload_too_large",
                  status: 413,
                }),
              );
            }
            return frames;
          }
          frames.push({ entity: entity.entity, id, clock: clockOf(entity, row), line, children });
          bytes += size;
        }
        continue;
      }

      const rows = yield* db
        .selectMany<Record<string, unknown>>(selectUnsyncedSql(entity, remaining))
        .pipe(
          Effect.mapError(
            (error) =>
              new SyncError({
                message: `Sinkronisasi ${entity.entity} gagal dibaca: ${error.message}`,
              }),
          ),
        );
      for (const raw of rows) {
        const row = toCanonicalRow(entity, raw);
        const line = encodeRowFrame(entity.entity, row);
        const size = bytesOf(line);
        if (!fits(size)) {
          if (frames.length === 0) {
            // A single row over 1 MB is not something the desktop writes, but a
            // corrupt row must not stall the group forever.
            return yield* Effect.fail(
              new SyncError({
                message: `Data ${entity.entity} terlalu besar untuk disinkronkan`,
                code: "payload_too_large",
                status: 413,
              }),
            );
          }
          return frames;
        }
        frames.push({ entity: entity.entity, id: idOf(entity, row), clock: clockOf(entity, row), line });
        bytes += size;
      }
    }
    return frames;
  });
}

/**
 * How many rows/aggregates this device owes the server right now.
 *
 * Read once per push so the progress bar has a denominator that does not move
 * with every batch: a total recomputed per batch makes the bar jump around, and
 * the user reads that as going backwards.
 */
function countUnsynced(db: DatabaseServiceImpl, group: SyncGroup): Effect.Effect<number, SyncError> {
  return Effect.gen(function* () {
    let total = 0;
    for (const entity of GROUPS[group].entities) {
      const rows = yield* db.selectMany<{ total: number }>(countUnsyncedSql(entity)).pipe(
        Effect.mapError(
          (error) =>
            new SyncError({
              message: `Sinkronisasi ${entity.entity} gagal dibaca: ${error.message}`,
            }),
        ),
      );
      total += rows[0]?.total ?? 0;
    }
    return total;
  });
}

/** True when the failure is worth re-sending the same batch for (§4.11). */
export { isRetryable };

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
    const stream = deps.transport.push(deps.endpoint, { group: deps.group, body });

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

/** Posts one batch, retrying a transport/5xx failure with exponential backoff. */
function postWithRetry(deps: PushDeps, frames: readonly Frame[]): Effect.Effect<Acks, SyncError> {
  const attempt = (remaining: number): Effect.Effect<Acks, SyncError> =>
    postBatch(deps, frames).pipe(
      Effect.catchAll((error) => {
        if (remaining <= 1 || !isRetryable(error)) return Effect.fail(error);
        const wait = backoffMs(MAX_ATTEMPTS - remaining);
        log.info(`sync: push retry in ${wait}ms after "${error.code ?? "transport"}": ${error.message}`);
        return Effect.sleep(`${wait} millis`).pipe(Effect.flatMap(() => attempt(remaining - 1)));
      }),
    );
  return attempt(MAX_ATTEMPTS);
}

/**
 * Applies one batch's acks: markers for `applied`/`noop`, the server's
 * row/aggregate for `stale`, all in one transaction.
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
      const def: EntityDef | undefined = TABLES[ack.e];
      if (def === undefined) continue;
      if (ack.s === "stale") {
        stale += 1;
        // The server's copy is the truth; overwrite it unless the local
        // row/aggregate was edited after this frame left (`since` = the clock we
        // uploaded). For record, the children come with it (§4.4).
        statements.push(
          ...staleStatements(def, GROUPS[def.group].children, ack.row, ack.ch, ack.seq, frame.clock),
        );
        continue;
      }
      statements.push(markSyncedStatement(def, frame.id, ack.seq, frame.clock));
    }

    yield* deps.execute(statements, `${deps.group} push`);
    return { pushed, stale };
  });
}

/** Pushes every row/record this device owes the server, batch by batch (§4.6). */
export function push(deps: PushDeps): Effect.Effect<PushOutcome, SyncError> {
  return Effect.gen(function* () {
    let pushed = 0;
    let stale = 0;
    // One denominator for the whole push, so the bar advances instead of jumping.
    const expected = yield* countUnsynced(deps.db, deps.group);
    deps.onProgress?.({ entity: null, done: 0, total: expected });

    for (let pass = 0; pass < MAX_PASSES; pass++) {
      const frames = yield* readBatch(deps.db, deps.group);
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
