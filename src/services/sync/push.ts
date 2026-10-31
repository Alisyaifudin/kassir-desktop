/**
 * Push → acknowledge (contract §5.3, §7).
 *
 * One upload session covers every entity in the fixed order of §2.3. Frames are
 * encoded from the local unsync set and appended in chunks (≤ 200 frames and well
 * under the server's 1 MB commit bound), each PATCH carrying the uncompressed
 * offset plus the chain hash of the bytes before it (§7.3). The server streams one
 * ack per committed frame, which is where `_sync_at` finally gets set.
 *
 * ## Why a chunk is a whole frame list, not a live stream
 *
 * The contract says this explicitly (§5.3): "a single PATCH need not carry the
 * whole upload … plain sequential PATCH calls satisfy the contract". A streaming
 * request body is not reliable on this webview, and the chain hash has to be
 * computed over the plaintext bytes anyway, so the client materialises the frames
 * it is about to send and then PATCHes them.
 *
 * ## Why a run starts with a fresh session
 *
 * Resuming costs a byte offset plus the prefix hash the server can verify. The
 * `GET /v1/upload/:id` response does not expose that hash, and re-deriving it
 * locally is only possible when the exact prefix bytes can be regenerated — true
 * only if nothing was written locally in between. Since every frame is idempotent
 * (§7.5), the contract's own recovery path is always available: drop the session
 * and re-send the unsync set. Work already acknowledged is gone from the unsync
 * set, so a retry resumes at the first unacked row.
 */
import { Context, Effect } from "effect";
import type { DatabaseService } from "../db";
import { EMPTY_CHAIN } from "./chain";
import { encodeRecordFrame, encodeRowFrame, parseAckFrame, parseLine } from "./frames";
import { ENTITY_ORDER, TABLES, type Entity, type WireRow } from "./schema";
import { countUnsynced, encodeEntityFrames, markSynced } from "./local";
import { consumeLines, TransportError, type Endpoint, type Session, type SyncTransport } from "./transport";
import { SyncError } from "./index";
import { toSyncError } from "./pull";
import { log } from "~/lib/log";

type DatabaseServiceImpl = Context.Tag.Service<typeof DatabaseService>;

/** Server commit bound is 256 frames; stay under it so one PATCH is one commit. */
const MAX_FRAMES_PER_CHUNK = 200;
/** Stay well under the 1 MB bound, so even a fat record aggregate fits a chunk. */
const MAX_BYTES_PER_CHUNK = 512 * 1024;
/** Attempts at one pass, restarted with a fresh session on a session failure. */
const MAX_ATTEMPTS = 3;
/** Passes over the unsync set, for writes that land while the push runs. */
const MAX_PASSES = 3;

/** The open session's pointer plus the chain hash at `at` (§7.3). */
export type UploadState = Session & { chain: string };

export type PushOutcome = {
  pushed: number;
  stale: number;
  /**
   * The `sync_seq` values the server assigned to frames this run pushed.
   *
   * §5.3: "for `applied`, `seq` is the server-assigned sync_seq — the client MAY
   * advance its pull cursor to `seq` after merging its own pushed row". `live.ts`
   * uses it only when the values run contiguously from the pull snapshot, so a
   * second writer's rows can never be skipped.
   */
  appliedSeqs: number[];
};

type Frame = { entity: Entity; id: string; updatedAt: number; line: string };

export type PushDeps = {
  db: DatabaseServiceImpl;
  transport: SyncTransport;
  endpoint: Endpoint;
  /** The persisted session id, if one was left behind (§3.2). */
  readUploadId: () => Effect.Effect<string | null>;
  /** Persists the session pointer and chain, for diagnostics. */
  writeUploadState: (state: UploadState) => Effect.Effect<void>;
  clearUploadState: () => Effect.Effect<void>;
  /** Applies the server's winning row/aggregate from a `stale` ack (§5.2). */
  mergeStaleRow: (entity: Entity, row: WireRow) => Effect.Effect<void, SyncError>;
  mergeStaleAggregate: (
    row: WireRow,
    children: Record<string, WireRow[]>,
  ) => Effect.Effect<void, SyncError>;
  onProgress: (progress: { entity: Entity | null; done: number; total: number }) => void;
};

/** Groups encoded frames into PATCH-sized chunks, never splitting a line. */
export function chunkFrames(frames: readonly Frame[]): Frame[][] {
  const chunks: Frame[][] = [];
  let current: Frame[] = [];
  let bytes = 0;
  for (const frame of frames) {
    const size = frame.line.length + 1;
    if (
      current.length > 0 &&
      (current.length >= MAX_FRAMES_PER_CHUNK || bytes + size > MAX_BYTES_PER_CHUNK)
    ) {
      chunks.push(current);
      current = [];
      bytes = 0;
    }
    current.push(frame);
    bytes += size;
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}

/** How many frames the push still owes the server, for progress. */
function countFrames(deps: PushDeps): Effect.Effect<number, SyncError> {
  return Effect.gen(function* () {
    let total = 0;
    for (const entity of ENTITY_ORDER) {
      total += yield* countUnsynced(deps.db, TABLES[entity]);
    }
    return total;
  });
}

/** True when the failure is one the "new session" recovery path can fix (§7.5). */
export function isSessionFailure(error: SyncError): boolean {
  if (error.code === "replay_mismatch" || error.code === "offset_conflict") return true;
  if (error.code === "not_found") return true;
  // A dropped connection mid-PATCH (status 0) and a gateway hiccup are resolved
  // by re-sending the unsync set in a fresh session.
  return error.status === 0 || (error.status ?? 0) >= 500;
}

/**
 * Opens the upload session.
 *
 * A leftover session is re-read first (§5.3 "resume check") and only reused when
 * the server reports it has committed nothing (`at = 0`, `frames = 0`): then the
 * prefix hash is still the chain anchor, so the pointer is provably in step. Any
 * other state is dropped and replaced — the `GET` response does not expose the
 * server's prefix hash, and re-deriving it locally would need the exact bytes of a
 * prefix that this run did not produce (§7.5, and see the module comment).
 */
function openSession(deps: PushDeps): Effect.Effect<UploadState, SyncError> {
  return Effect.gen(function* () {
    const existing = yield* deps.readUploadId();
    if (existing !== null) {
      const current = yield* Effect.tryPromise({
        try: () => deps.transport.getSession(deps.endpoint, existing),
        catch: () => null,
      }).pipe(Effect.orElseSucceed(() => null));
      if (current !== null && current.at === 0 && current.frames === 0) {
        const state: UploadState = { ...current, chain: EMPTY_CHAIN };
        yield* deps.writeUploadState(state);
        return state;
      }
      yield* Effect.tryPromise({
        try: () => deps.transport.deleteSession(deps.endpoint, existing),
        catch: toSyncError,
      }).pipe(Effect.catchAll(() => Effect.void));
    }
    const session = yield* Effect.tryPromise({
      try: () => deps.transport.createSession(deps.endpoint),
      catch: toSyncError,
    });
    const state: UploadState = { ...session, chain: EMPTY_CHAIN };
    yield* deps.writeUploadState(state);
    return state;
  });
}

/** A chunk's ack stream, collected before anything is written. */
type ChunkAcks = {
  done: { at: number; frames: number } | null;
  acks: {
    index: number;
    outcome: "applied" | "stale" | "noop";
    /** The server-assigned seq for an `applied` frame (§5.3). */
    seq: number | null;
    row: WireRow | null;
    children: Record<string, WireRow[]> | null;
  }[];
};

/**
 * PATCHes one chunk and collects the ack stream.
 *
 * Collecting first and writing second keeps every `_sync_at` update in Effect
 * land (where the clock guard lives, `sql.ts`) and keeps an interrupted fiber from
 * leaving a half-applied ack batch. The reader is cancelled explicitly on
 * interruption, so leaving the Sinkronisasi screen stops the request.
 */
function sendChunk(
  deps: PushDeps,
  state: UploadState,
  body: string,
): Effect.Effect<ChunkAcks, SyncError> {
  return Effect.gen(function* () {
    const stream = deps.transport.uploadChunk(deps.endpoint, {
      uploadId: state.uploadId,
      offset: state.at,
      prefixSha: state.chain,
      body,
      // §4.3: gzip is a transport layer only; offsets and hashes are over the
      // plaintext above. A server that refuses the coding gets an identity retry
      // inside the Rust command.
      compress: true,
    });

    const collected: ChunkAcks = { done: null, acks: [] };
    yield* Effect.tryPromise({
      try: () =>
        consumeLines(stream, (line) => {
          const frame = parseAckFrame(parseLine(line));
          if (frame.t === "error") throw new TransportError(0, frame.code, frame.message);
          if (frame.t === "done") {
            collected.done = { at: frame.at, frames: frame.frames };
            return;
          }
          if (frame.outcome === "stale") {
            collected.acks.push({
              index: frame.index,
              outcome: "stale",
              seq: null,
              row: frame.row,
              children: frame.children,
            });
            return;
          }
          collected.acks.push({
            index: frame.index,
            outcome: frame.outcome,
            seq: frame.outcome === "applied" ? frame.seq : null,
            row: null,
            children: null,
          });
        }),
      catch: toSyncError,
    }).pipe(Effect.onInterrupt(() => Effect.sync(() => stream.cancel())));

    return collected;
  });
}

/** Applies one chunk's acks: stale payloads first, then the sync markers. */
function applyAcks(
  deps: PushDeps,
  chunk: readonly Frame[],
  firstIndex: number,
  acks: ChunkAcks["acks"],
): Effect.Effect<{ applied: number; stale: number; seqs: number[] }, SyncError> {
  return Effect.gen(function* () {
    const syncedAt = Date.now();
    const acked = new Map<Entity, { id: string; updatedAt: number }[]>();
    const seqs: number[] = [];
    let stale = 0;

    for (const ack of acks) {
      const frame = chunk[ack.index - firstIndex];
      if (frame === undefined) {
        // An index outside the chunk means the server and client disagree about
        // the session: drop it rather than marking the wrong row as sent.
        return yield* Effect.fail(
          new SyncError({
            message: "Server dan aplikasi tidak sepakat soal posisi unggahan",
            code: "replay_mismatch",
            status: 409,
          }),
        );
      }
      if (ack.seq !== null) seqs.push(ack.seq);
      if (ack.outcome === "stale") {
        stale += 1;
        // `product_event` is append-only (§6.3): even a stale answer must never
        // rewrite a journal row, so the marker below is all that is applied.
        if (frame.entity !== "product_event") {
          if (frame.entity === "record" && ack.children !== null && ack.row !== null) {
            yield* deps.mergeStaleAggregate(ack.row, ack.children);
          } else if (ack.row !== null) {
            yield* deps.mergeStaleRow(frame.entity, ack.row);
          }
        }
      }
      const list = acked.get(frame.entity) ?? [];
      list.push({ id: frame.id, updatedAt: frame.updatedAt });
      acked.set(frame.entity, list);
    }

    // One marker write per entity per chunk instead of one per frame.
    for (const [entity, entries] of acked) {
      yield* markSynced(deps.db, entity, entries, syncedAt);
    }

    return { applied: acks.length, stale, seqs };
  });
}

/** Pushes every unsync row in the contract's entity order (§2.3). */
export function push(deps: PushDeps): Effect.Effect<PushOutcome, SyncError> {
  return Effect.gen(function* () {
    let total = yield* countFrames(deps);
    deps.onProgress({ entity: null, done: 0, total });

    let pushed = 0;
    let stale = 0;
    const appliedSeqs: number[] = [];

    for (let pass = 0; pass < MAX_PASSES; pass++) {
      let ackedThisPass = 0;

      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const outcome = yield* pushOnce(deps, { total, doneBefore: pushed }).pipe(Effect.either);
        if (outcome._tag === "Right") {
          ackedThisPass += outcome.right.acked;
          pushed += outcome.right.acked;
          stale += outcome.right.stale;
          appliedSeqs.push(...outcome.right.seqs);
          break;
        }

        const error = outcome.left;
        if (!isSessionFailure(error) || attempt === MAX_ATTEMPTS - 1) {
          return yield* Effect.fail(error);
        }
        log.info(`sync: push retry after "${error.code ?? "transport"}": ${error.message}`);
      }

      total = yield* countFrames(deps);
      if (total === 0) break;
      // A local write during the push is unsync again, so one more pass drains it
      // — unless nothing was acknowledged, in which case another pass would spin.
      if (ackedThisPass === 0) break;
      pushed = 0;
      deps.onProgress({ entity: null, done: 0, total });
    }

    return { pushed, stale, appliedSeqs };
  });
}

/** One pass over the unsync set, inside one session. */
function pushOnce(
  deps: PushDeps,
  progress: { total: number; doneBefore: number },
): Effect.Effect<{ acked: number; stale: number; seqs: number[] }, SyncError> {
  return Effect.gen(function* () {
    let state = yield* openSession(deps);
    let frameIndex = state.frames;
    let acked = progress.doneBefore;
    let stale = 0;
    const seqs: number[] = [];

    for (const entity of ENTITY_ORDER) {
      deps.onProgress({ entity, done: acked, total: Math.max(progress.total, acked) });

      const encoded = yield* encodeEntityFrames(
        deps.db,
        TABLES[entity],
        encodeRowFrame,
        encodeRecordFrame,
      );
      if (encoded.length === 0) continue;

      for (const chunk of chunkFrames(encoded)) {
        const lines = chunk.map((frame) => frame.line);
        // §7.3: the chain is over the plaintext lines, one step per line, and the
        // header carries the hash *before* these bytes, not after.
        const chain = yield* Effect.tryPromise({
          try: () => deps.transport.chain(state.chain, lines),
          catch: toSyncError,
        });
        const firstIndex = frameIndex;

        const result = yield* sendChunk(deps, state, `${lines.join("\n")}\n`);

        const done = result.done;
        if (done === null) {
          return yield* Effect.fail(
            new SyncError({
              message: "Server tidak mengirim posisi unggahan",
              code: "bad_frame",
            }),
          );
        }
        if (done.at !== state.at + chain.bytes || done.frames !== frameIndex + chunk.length) {
          // The server committed a different amount than the bytes we sent, so the
          // local pointer cannot be trusted: a fresh session re-sends.
          return yield* Effect.fail(
            new SyncError({
              message: "Posisi unggahan tidak cocok dengan server",
              code: "offset_conflict",
              status: 409,
            }),
          );
        }

        const applied = yield* applyAcks(deps, chunk, firstIndex, result.acks);
        stale += applied.stale;
        seqs.push(...applied.seqs);

        frameIndex = done.frames;
        state = { ...state, at: done.at, frames: done.frames, chain: chain.chain };
        yield* deps.writeUploadState(state);
        acked += applied.applied;
        deps.onProgress({ entity, done: acked, total: Math.max(progress.total, acked) });
      }
    }

    yield* deps.clearUploadState();
    return { acked: acked - progress.doneBefore, stale, seqs };
  });
}
