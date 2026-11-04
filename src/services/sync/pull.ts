/**
 * The pull half of the loop: one request, one page (`SYNC-V2.md` §3).
 *
 * This module owns the HTTP side and nothing else. It walks
 * `GET /v2/<group>/pull/:seq` one page at a time, decoding lines as they arrive,
 * and hands the page to the merge. The bookmark is *not* advanced here: it moves
 * only after the merge has committed, so a failure or an interruption re-pulls
 * the same page and nothing is silently skipped (§3.3, §3.4).
 */
import { Effect } from "effect";
import { FrameError, parseLine, parsePullFrame } from "./frames";
import type { PullAggregate, PullChange, PullDelete, PullPage } from "./merge";
import { GROUPS, type SyncGroup } from "./schema";
import { SyncError } from ".";
import { backoffMs, isRetryable } from "./retry";
import { consumeLines, TransportError, type Endpoint, type SyncTransport } from "./transport";
import type { LineStream } from "./stream";

/**
 * Changes per pull request, unless the caller asks for another size.
 *
 * The server's default is 5000 and its maximum 20000 for the simple groups and
 * 1000/5000 for record; using the group's default keeps one page one modest
 * transaction, so a first full sync is a few hundred round trips instead of a
 * handful — the right trade while the merge is still being proven: a smaller page
 * is a smaller rollback (§9.13 keeps the default on purpose).
 */
export function pullLimit(group: SyncGroup): number {
  return GROUPS[group].pullLimit;
}

export type PullPageOutcome = {
  page: PullPage;
  /** The highest seq that existed when the response started (progress only). */
  snapshot: number | null;
  /**
   * How many entries this group still had when the page was cut — `meta.count`,
   * sent only when the request asked for it. `null` on an older server, and on
   * every page but the first, where it says nothing new.
   */
  count: number | null;
  /** Canonical bytes of this response (each line plus its newline). */
  bytes: number;
  /** The highest seq actually sent — the new bookmark (§3.2). */
  lastSeq: number;
  /** More changes exist above `lastSeq`; ask again. */
  more: boolean;
};

export type PullDeps = {
  transport: SyncTransport;
  endpoint: Endpoint;
  group: SyncGroup;
  /** The bookmark: the highest seq durably stored. `0` on first sync. */
  after: number;
  /** Per-request limit; defaults to the group's. */
  limit?: number;
  /**
   * Ask the server to size this group's backlog (`meta.count`).
   *
   * Set on the **first** page of a pull sequence only: the answer is a count of
   * the whole remaining range, which is exactly what a later page already knows.
   */
  count?: boolean;
  /** Progress, so the screen can show what is arriving. */
  onProgress?: (progress: { entity: string | null; done: number; total: number }) => void;
};

/**
 * UTF-8 bytes of one framed line, newline included.
 *
 * The wire is UTF-8 NDJSON, so this is the number the server logs as
 * `canonical_bytes` — the same figure, measured from the same lines.
 */
const encoder = new TextEncoder();

function lineBytes(line: string): number {
  return encoder.encode(line).length + 1;
}

/** Drains one pull response into a page, merging nothing. */
async function collectPage(group: SyncGroup, stream: LineStream): Promise<PullPageOutcome> {
  const changes: PullChange[] = [];
  const aggregates: PullAggregate[] = [];
  const deletions: PullDelete[] = [];
  let snapshot: number | null = null;
  let count: number | null = null;
  let bytes = 0;
  let lastSeq: number | null = null;
  let more = false;

  await consumeLines(stream, (line) => {
    bytes += lineBytes(line);
    const frame = parsePullFrame(group, parseLine(line));
    // `null` = a line this group does not carry (an unknown `t`, another
    // group's entity). §2.9 requires skipping it, not aborting the page.
    if (frame === null) return;
    switch (frame.t) {
      case "meta":
        snapshot = frame.snapshot;
        count = frame.count;
        return;
      case "row":
        changes.push({ seq: frame.s, entity: frame.e, row: frame.r });
        return;
      case "ag":
        aggregates.push({ seq: frame.s, row: frame.r, children: frame.ch });
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

  return {
    page: { changes, aggregates, deletions },
    snapshot,
    count,
    bytes,
    lastSeq: lastSeq ?? -1,
    more,
  };
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
      floor: error.floor,
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
 * (§3.3).
 */
export function pullPage(deps: PullDeps): Effect.Effect<PullPageOutcome, SyncError> {
  return Effect.gen(function* () {
    const limit = deps.limit ?? pullLimit(deps.group);
    const stream = deps.transport.pull(deps.endpoint, {
      group: deps.group,
      after: deps.after,
      limit,
      count: deps.count === true,
    });

    let seen = 0;
    const outcome = yield* Effect.tryPromise({
      try: () =>
        collectPage(deps.group, stream).then((result) => {
          seen =
            result.page.changes.length +
            result.page.aggregates.length +
            result.page.deletions.length;
          return result;
        }),
      catch: toSyncError,
    }).pipe(Effect.onInterrupt(() => Effect.sync(() => stream.cancel())));

    deps.onProgress?.({ entity: null, done: seen, total: seen });
    if (outcome.lastSeq < 0) {
      // No `done` line: the page has no bookmark to move to, and guessing one
      // would either skip changes or loop forever on the same page (§3.3).
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

/** Attempts at one page before the cycle gives up; the next run asks again. */
const MAX_ATTEMPTS = 5;

/**
 * `pullPage`, retried on a transport/5xx failure with exponential backoff
 * (§4.11).
 *
 * A page is idempotent, so re-asking is always correct: the bookmark did not move
 * (the merge never ran), and the server answers the same range. A `4xx` is a
 * decision — `400`/`410` are the re-seed path — so it is not retried here.
 */
export function pullPageWithRetry(
  deps: PullDeps,
  attempts = MAX_ATTEMPTS,
): Effect.Effect<PullPageOutcome, SyncError> {
  const attempt = (remaining: number): Effect.Effect<PullPageOutcome, SyncError> =>
    pullPage(deps).pipe(
      Effect.catchAll((error) => {
        if (remaining <= 1 || !isRetryable(error)) return Effect.fail(error);
        const wait = backoffMs(MAX_ATTEMPTS - remaining);
        return Effect.sleep(`${wait} millis`).pipe(Effect.flatMap(() => attempt(remaining - 1)));
      }),
    );
  return attempt(attempts);
}
