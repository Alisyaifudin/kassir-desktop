/**
 * The pull half of the loop: one request, one page (§6).
 *
 * This module owns the HTTP side and nothing else. It walks
 * `GET /v2/money/pull/:seq` one page at a time, decoding lines as they arrive,
 * and hands the page to the merge. The bookmark is *not* advanced here: it moves
 * only after the merge has committed, so a failure or an interruption re-pulls
 * the same page and nothing is silently skipped (§6.5).
 */
import { Effect } from "effect";
import { FrameError, parseLine, parsePullFrame } from "./frames";
import type { PullChange, PullDelete, PullPage } from "./merge";
import type { Entity, WireRow } from "./schema";
import { SyncError } from ".";
import { consumeLines, TransportError, type Endpoint, type SyncTransport } from "./transport";
import type { LineStream } from "./stream";

/**
 * Changes per pull request.
 *
 * The server's default is 5000 and its maximum 20000. 1000 keeps one page one
 * modest transaction — a first full sync of a large ledger is a few hundred
 * round trips instead of a handful, which is the right trade while the merge is
 * still being proven: a smaller page is a smaller rollback.
 */
export const PULL_LIMIT = 1000;

export type PullPageOutcome = {
  page: PullPage;
  /** The highest seq that existed when the response started (progress only). */
  snapshot: number | null;
  /** The highest seq actually sent — the new bookmark (§6.2). */
  lastSeq: number;
  /** More changes exist above `lastSeq`; ask again. */
  more: boolean;
};

export type PullDeps = {
  transport: SyncTransport;
  endpoint: Endpoint;
  /** The bookmark: the highest seq durably stored. `0` on first sync. */
  after: number;
  /** Per-entity progress, so the screen can show what is arriving. */
  onProgress?: (progress: { entity: Entity | null; done: number; total: number }) => void;
};

/** Drains one pull response into a page, merging nothing. */
async function collectPage(stream: LineStream): Promise<PullPageOutcome> {
  const changes: PullChange[] = [];
  const deletions: PullDelete[] = [];
  let snapshot: number | null = null;
  let lastSeq: number | null = null;
  let more = false;

  await consumeLines(stream, (line) => {
    const frame = parsePullFrame(parseLine(line));
    switch (frame.t) {
      case "meta":
        snapshot = frame.snapshot;
        return;
      case "row":
        changes.push({ seq: frame.s, entity: frame.e, row: frame.r as WireRow });
        return;
      case "del":
        deletions.push({ seq: frame.s, entity: frame.e, id: frame.id });
        return;
      case "done":
        lastSeq = frame.s;
        more = frame.more;
        return;
    }
  });

  return { page: { changes, deletions }, snapshot, lastSeq: lastSeq ?? -1, more };
}

/** Maps a transport rejection onto the service's error. */
export function toSyncError(error: unknown): SyncError {
  if (error instanceof SyncError) return error;
  if (error instanceof FrameError) {
    return new SyncError({ message: error.message, code: "bad_frame" });
  }
  if (error instanceof TransportError) {
    return new SyncError({
      message: error.message,
      code: error.code,
      status: error.status,
    });
  }
  if (error instanceof Error) return new SyncError({ message: error.message });
  return new SyncError({ message: String(error) });
}

/**
 * Streams one page of changes.
 *
 * `done.s` is the bookmark, not `meta.snapshot`: a page can stop early
 * (`more: true`), and storing the snapshot would skip everything after `done.s`
 * (§6.4).
 */
export function pullPage(deps: PullDeps): Effect.Effect<PullPageOutcome, SyncError> {
  return Effect.gen(function* () {
    const stream = deps.transport.pull(deps.endpoint, {
      after: deps.after,
      limit: PULL_LIMIT,
    });

    let seen = 0;
    const outcome = yield* Effect.tryPromise({
      try: () =>
        collectPage(stream).then((result) => {
          seen = result.page.changes.length + result.page.deletions.length;
          return result;
        }),
      catch: toSyncError,
    }).pipe(Effect.onInterrupt(() => Effect.sync(() => stream.cancel())));

    deps.onProgress?.({ entity: null, done: seen, total: seen });
    if (outcome.lastSeq < 0) {
      // No `done` line: the page has no bookmark to move to, and guessing one
      // would either skip changes or loop forever on the same page.
      return yield* Effect.fail(
        new SyncError({
          message: "Server tidak mengirim penanda akhir unduhan",
          code: "bad_frame",
        }),
      );
    }
    return outcome;
  });
}
