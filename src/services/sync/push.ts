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
  countUnsyncedProductSql,
  countUnsyncedSql,
  markSyncedStatement,
  selectChildrenSql,
  selectUnsyncedAggregateSql,
  selectUnsyncedProductSql,
  selectUnsyncedSql,
} from "./sql";
import { consumeLines, type Endpoint, type MergeStatement, type SyncTransport } from "./transport";

type DatabaseServiceImpl = Context.Tag.Service<typeof DatabaseService>;

/**
 * Batches one push may send before it stops and says what is still owed.
 *
 * The contract's algorithm (§4.6) ends on an empty batch, never on a count. This
 * bound is only a runaway guard for a till whose own writes outrun the network:
 * it used to be `5`, which meant a first upload stopped dead at
 * `5 × pushFrames` = 5000 rows per group and reported success — a shop with a
 * 6000-row catalogue ended up with exactly 5000 of everything on the other
 * device, and no screen anywhere said a row was missing.
 */
const PASS_LIMIT = 1000;
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
  /**
   * The product this row belongs to, for the groups that have one.
   *
   * Carried so the cycle can fold the stock projection for the journal it just
   * uploaded: the rows the server accepted never come back through the pull (§9.2
   * — the closing pull drops this device's own entries), so the fold has to happen
   * where the push still knows which products they were.
   */
  productId?: string;
};

export type PushDeps = {
  db: DatabaseServiceImpl;
  transport: SyncTransport;
  endpoint: Endpoint;
  group: SyncGroup;
  execute: MergeExecutor;
  /**
   * Narrow the push to one product's dirty rows and post them through the
   * scoped route (`SYNC-V2-ONE-PRODUCT.md` §3.4). Omit for a full group push.
   */
  productId?: string;
  /**
   * Batches this push may send, when the caller wants a tighter bound than the
   * runaway guard. A scoped product push asks for its own (§ `one-product.ts`).
   */
  maxPasses?: number;
  /**
   * Rows/aggregates owed, when the caller already counted them.
   *
   * The cycle counts them once while it plans the bar, so re-counting here would
   * be a second scan of every unsynced table for a number the screen already
   * has. Omitted, the push counts for itself.
   */
  expected?: number;
  onProgress?: (progress: {
    entity: string | null;
    done: number;
    total: number;
    /** Bytes posted so far, across every batch of this push. */
    bytes: number;
  }) => void;
};

export type PushOutcome = {
  /** Frames the server acknowledged, whatever the outcome. */
  pushed: number;
  /** Frames the server's copy won. */
  stale: number;
  /** Bytes this push put on the wire. */
  bytes: number;
  /**
   * The log entries this push created, by their `seq`.
   *
   * Only `applied` acks carry one: a `noop`/`stale` frame wrote nothing, so the
   * entry it names belongs to whoever wrote it first. The cycle hands these to the
   * closing pull, which drops them — they are this device's own rows coming back, a
   * `noop` by construction, and on a first upload that is the entire catalogue.
   */
  written: readonly number[];
  /**
   * The products whose journal entries the server accepted, for the groups that
   * keep one.
   *
   * `stocks` is a projection of that journal (§8.7), and the projection is folded
   * on the pull side — which no longer sees this device's own uploads. So the push
   * names them, and the cycle folds them once the batch is acked.
   */
  appliedJournal: readonly string[];
  /**
   * Rows/records still owed after this push.
   *
   * Non-zero only when the loop stopped before the unsync set drained — the
   * runaway guard, or a server that acked fewer frames than it was sent. It is
   * reported so a run that leaves work behind cannot call itself finished.
   */
  remaining: number;
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
 * One batch, ready to post, with the bytes it will put on the wire.
 *
 * `bytes` is the compressed-identity body size the server's `push_bytes` bound
 * is measured in (§4.1, §16.1) — and, since the batch is sent as it is built,
 * also the upload byte counter the screen shows.
 */
type Batch = { frames: Frame[]; bytes: number };

/**
 * Reads the next batch: entities in the group's push order, within the frame and
 * byte bounds. A record never splits across frames or requests.
 */
function readBatch(
  db: DatabaseServiceImpl,
  group: SyncGroup,
  productId?: string,
): Effect.Effect<Batch, SyncError> {
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
            return { frames, bytes };
          }
          frames.push({ entity: entity.entity, id, clock: clockOf(entity, row), line, children });
          bytes += size;
        }
        continue;
      }

      const rows = yield* db
        .selectMany<Record<string, unknown>>(
          productId === undefined
            ? selectUnsyncedSql(entity, remaining)
            : selectUnsyncedProductSql(entity, remaining),
          productId === undefined ? undefined : [productId],
        )
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
          return { frames, bytes };
        }
        const productId = row["product_id"];
        frames.push({
          entity: entity.entity,
          id: idOf(entity, row),
          clock: clockOf(entity, row),
          line,
          ...(typeof productId === "string" ? { productId } : {}),
        });
        bytes += size;
      }
    }
    return { frames, bytes };
  });
}

/**
 * How many rows/aggregates this device owes the server right now.
 *
 * Read once per push so the progress bar has a denominator that does not move
 * with every batch: a total recomputed per batch makes the bar jump around, and
 * the user reads that as going backwards. The cycle reads it once more, before
 * the pull, to weigh the push against the pull in the plan behind the bar — and
 * hands that number back in `expected`, so the push itself never counts twice.
 */
export function countUnsynced(
  db: DatabaseServiceImpl,
  group: SyncGroup,
  productId?: string,
): Effect.Effect<number, SyncError> {
  return Effect.gen(function* () {
    let total = 0;
    for (const entity of GROUPS[group].entities) {
      const rows = yield* db
        .selectMany<{ total: number }>(
          productId === undefined
            ? countUnsyncedSql(entity)
            : countUnsyncedProductSql(entity),
          productId === undefined ? undefined : [productId],
        )
        .pipe(
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
    const stream =
      deps.productId === undefined
        ? deps.transport.push(deps.endpoint, { group: deps.group, body })
        : deps.transport.productPush(deps.endpoint, { productId: deps.productId, body });

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
 * The products these frames' journal entries belong to, when the server accepted
 * them.
 *
 * Only `applied`: a `noop`/`stale` frame changed nothing here or there, so nothing
 * needs folding. Used by the product group to keep `stocks` in step with the journal
 * it just uploaded.
 */
function foldedProducts(frames: readonly Frame[], applied: readonly number[]): string[] {
  const out = new Set<string>();
  for (const index of applied) {
    const frame = frames[index];
    if (frame === undefined || frame.entity !== "product_event") continue;
    if (frame.productId !== undefined) out.add(frame.productId);
  }
  return [...out];
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
): Effect.Effect<
  { pushed: number; stale: number; written: number[]; appliedJournal: string[] },
  SyncError
> {
  return Effect.gen(function* () {
    const statements: MergeStatement[] = [];
    const written: number[] = [];
    const appliedIndexes: number[] = [];
    let stale = 0;
    let pushed = 0;

    for (const ack of acks) {
      const frame = frames[ack.i];
      if (frame === undefined) continue;
      pushed += 1;
      // An applied frame is an entry this device just created; its seq is the one
      // the closing pull will hand straight back.
      if (ack.s === "applied") {
        if (ack.seq > 0) written.push(ack.seq);
        appliedIndexes.push(ack.i);
      }
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
    return { pushed, stale, written, appliedJournal: foldedProducts(frames, appliedIndexes) };
  });
}

/** Pushes every row/record this device owes the server, batch by batch (§4.6). */
export function push(deps: PushDeps): Effect.Effect<PushOutcome, SyncError> {
  return Effect.gen(function* () {
    let pushed = 0;
    let stale = 0;
    let sent = 0;
    const written: number[] = [];
    const appliedJournal = new Set<string>();
    // One denominator for the whole push, so the bar advances instead of jumping.
    const expected = deps.expected ?? (yield* countUnsynced(deps.db, deps.group, deps.productId));
    deps.onProgress?.({ entity: null, done: 0, total: expected, bytes: sent });

    const maxPasses = deps.maxPasses ?? PASS_LIMIT;
    /** True when a read found nothing left — the only clean way out of the loop. */
    let drained = false;
    for (let pass = 0; pass < maxPasses; pass++) {
      const batch = yield* readBatch(deps.db, deps.group, deps.productId);
      const frames = batch.frames;
      if (frames.length === 0) {
        drained = true;
        break;
      }

      deps.onProgress?.({ entity: null, done: pushed, total: Math.max(expected, pushed), bytes: sent });
      const acks = yield* postWithRetry(deps, frames);
      // Counted once the ack lands: a retried batch did go out twice, but the
      // wire counter exists to show the work, not to bill it.
      sent += batch.bytes;
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
      written.push(...applied.written);
      for (const productId of applied.appliedJournal) appliedJournal.add(productId);
      deps.onProgress?.({ entity: null, done: pushed, total: Math.max(expected, pushed), bytes: sent });

      // A local write during the push leaves more rows unsynced; loop again. If
      // the batch changed nothing at all, another pass would spin, so the next
      // iteration reads the batch and breaks on empty.
      if (acks.acks.length < frames.length) break;
    }

    // Whatever is left is counted and returned, never quietly dropped: a group
    // that still owes rows has not finished, and the screen says so.
    const remaining = drained
      ? 0
      : yield* countUnsynced(deps.db, deps.group, deps.productId);

    return { pushed, stale, bytes: sent, written, appliedJournal: [...appliedJournal], remaining };
  });
}
