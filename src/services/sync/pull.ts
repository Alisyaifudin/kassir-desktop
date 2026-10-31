/**
 * The pull half of the loop (contract §5.1, §8): **stream only**.
 *
 * This module owns the HTTP side and nothing else. It walks `GET /v1/pull` page by
 * page, decoding frames as they arrive, and returns the whole gap for the merge to
 * write in one batch. Two consequences are deliberate:
 *
 *   * the merge sees every frame of the pull at once, so a reference can be
 *     resolved against the pull itself instead of "maybe later" (`merge.ts`);
 *   * the cursor is *not* advanced here. It moves only after the merge has been
 *     applied, so a failure or an interruption re-pulls the same gap and nothing
 *     is silently skipped. Frames are idempotent to re-merge (LWW).
 *
 * Byte-offset resume (`Download-Offset`) is deliberately not implemented: the
 * contract calls it an optimization the client may skip entirely, and on
 * `409 snapshot_moved` the sanctioned fallback is what this loop does every time —
 * re-issue `since = last merged seq` at offset 0 (§8.2).
 */
import { Effect } from "effect";
import { parseLine, parsePullFrame, type PullAggregateFrame, type PullRowFrame } from "./frames";
import type { Entity, WireRow } from "./schema";
import { consumeLines, TransportError, type Endpoint, type SyncTransport } from "./transport";
import { SyncError } from "./index";
import { log } from "~/lib/log";

/** Frames per pull request. The server defaults to 1000; say it explicitly. */
export const PULL_LIMIT = 1000;

export type PullFrames = {
  rows: { entity: Entity; row: WireRow }[];
  aggregates: { row: WireRow; children: Record<string, WireRow[]> }[];
};

export type PullOutcome = {
  frames: PullFrames;
  /** The last seq the server emitted — the cursor to persist once merged. */
  lastPulledSeq: number;
  /** The server's max seq when the stream started; null if it sent no `meta`. */
  snapshotSeq: number | null;
  pages: number;
};

export type PullDeps = {
  transport: SyncTransport;
  endpoint: Endpoint;
  /** Where the local mirror currently stands (§3.2). */
  readCursor: () => Effect.Effect<number, SyncError>;
  /** Per-entity progress, so the screen can show what is arriving. */
  onProgress: (progress: { entity: Entity | null; done: number; total: number }) => void;
};

type Page = {
  rows: { entity: Entity; row: WireRow }[];
  aggregates: { row: WireRow; children: Record<string, WireRow[]> }[];
  snapshotSeq: number | null;
  lastSeq: number | null;
};

/**
 * Drains one pull response into a page.
 *
 * Kept as one promise rather than an Effect per line: the frames are decoded by an
 * async iterator, and the caller writes in Effect land afterwards, so an
 * interrupted fiber stops the stream (via `sync_cancel`) instead of leaving a
 * half-read page.
 */
async function collectPage(
  stream: ReturnType<SyncTransport["pull"]>,
  onFrame: (frame: PullRowFrame | PullAggregateFrame) => void,
): Promise<Page> {
  const page: Page = { rows: [], aggregates: [], snapshotSeq: null, lastSeq: null };
  await consumeLines(stream, (line) => {
    const frame = parsePullFrame(parseLine(line));
    switch (frame.t) {
      case "meta":
        page.snapshotSeq = frame.snapshotSeq;
        return;
      case "row":
        page.rows.push({ entity: frame.entity, row: frame.row });
        onFrame(frame);
        return;
      case "ag":
        page.aggregates.push({ row: frame.row, children: frame.children });
        onFrame(frame);
        return;
      case "done":
        page.lastSeq = frame.seq;
        return;
      case "error":
        throw new TransportError(0, frame.code, frame.message);
      default:
        return;
    }
  });
  return page;
}

/**
 * Streams the whole gap since the cursor. Nothing is written.
 *
 * Stops when the merged cursor reaches `meta.snapshot_seq` (§5.1), or when a page
 * makes no progress — a server that reports a snapshot it will not serve would
 * otherwise spin forever.
 */
export function pull(deps: PullDeps): Effect.Effect<PullOutcome, SyncError> {
  return Effect.gen(function* () {
    const start = yield* deps.readCursor();
    const frames: PullFrames = { rows: [], aggregates: [] };
    const counts = new Map<Entity, number>();
    let cursor = start;
    let snapshotSeq: number | null = null;
    let pages = 0;

    // A safety stop, not a page goal: the loop ends on `snapshot_seq`.
    for (let pageIndex = 0; pageIndex < 100_000; pageIndex++) {
      const stream = deps.transport.pull(deps.endpoint, { since: cursor, limit: PULL_LIMIT });
      const page = yield* Effect.tryPromise({
        try: () =>
          collectPage(stream, (frame) => {
            const entity = frame.t === "ag" ? "record" : frame.entity;
            counts.set(entity, (counts.get(entity) ?? 0) + 1);
            deps.onProgress({
              entity,
              done: [...counts.values()].reduce((total, value) => total + value, 0),
              total: 0,
            });
          }),
        catch: toSyncError,
      }).pipe(Effect.onInterrupt(() => Effect.sync(() => stream.cancel())));

      pages += 1;
      frames.rows.push(...page.rows);
      frames.aggregates.push(...page.aggregates);
      if (page.snapshotSeq !== null) snapshotSeq = page.snapshotSeq;

      // §5.1: `done.s` is the last seq emitted — the next `since`. It is not
      // `snapshot_seq`: rows written after the snapshot belong to the next pull.
      const next = Math.max(cursor, page.lastSeq ?? cursor);
      const empty = page.rows.length === 0 && page.aggregates.length === 0;
      const caughtUp = snapshotSeq === null || next >= snapshotSeq;
      if (caughtUp) {
        cursor = next;
        break;
      }
      if (empty || next === cursor) {
        // No progress: the next request would ask for the same `since`.
        log.info(`sync: pull stalled at seq ${cursor} (snapshot ${snapshotSeq})`);
        cursor = next;
        break;
      }
      cursor = next;
    }

    return {
      frames,
      lastPulledSeq: cursor,
      snapshotSeq,
      pages,
    };
  });
}

/** Maps a transport rejection onto the service's error. */
export function toSyncError(error: unknown): SyncError {
  if (error instanceof SyncError) return error;
  if (error instanceof TransportError) {
    return new SyncError({ message: error.message, code: error.code, status: error.status });
  }
  if (error instanceof Error) return new SyncError({ message: error.message });
  return new SyncError({ message: String(error) });
}
