/**
 * The one-product manual sync (`docs/SYNC-V2-ONE-PRODUCT.md`).
 *
 * A product detail page's "Sinkronkan produk" button runs this: push the dirty
 * rows of **one** product, then pull the server's snapshot of the same product,
 * then move that product's image bytes. It is a short, scoped product cycle —
 * not a second sync protocol:
 *
 *   * the push reuses `push()` from `push.ts` with `productId` set, so batching,
 *     acks, `stale` compare-and-set and the dirty flag are the full push's;
 *   * each pulled page is merged by `mergePage` **without** a bookmark commit,
 *     so the normal product stream's cursor cannot move;
 *   * the byte passes are the full cycle's, filtered by `productId`.
 *
 * Push before pull, not the full cycle's pull → push → pull: the scoped pull is
 * already a post-push snapshot, so it includes everything this device just sent.
 * A local row the server has newer comes back as a `stale` ack and is repaired
 * before the pull starts.
 */
import { Context, Effect } from "effect";
import type { DatabaseService } from "../db";
import { log } from "~/lib/log";
import { SyncError } from ".";
import { fetchImageBlobs, uploadImageBlobs } from "./blob";
import { parseLine, parsePullFrame } from "./frames";
import { mergePage, type MergeExecutor, type PullChange, type PullPage } from "./merge";
import { pullLimit } from "./pull";
import { push } from "./push";
import { backoffMs, isRetryable } from "./retry";
import type { LineStream } from "./stream";
import type { Endpoint, SyncTransport } from "./transport";
import { consumeLines } from "./transport";

type DatabaseImpl = Context.Tag.Service<typeof DatabaseService>;

/** How many batches a scoped push may send in one run. */
const MAX_PUSH_PASSES = 200;

/** How many snapshot pages one run may request before giving up. */
const MAX_PAGES = 1000;

/** Attempts at one snapshot page before the run fails; the next run retries. */
const MAX_ATTEMPTS = 5;

export type OneProductDeps = {
  db: DatabaseImpl;
  transport: SyncTransport;
  endpoint: Endpoint;
  productId: string;
  execute: MergeExecutor;
  /** Re-reads the product service so the detail page paints the merged rows. */
  refresh: () => Effect.Effect<void>;
};

/** What one scoped run did, for the button's toast. */
export type OneProductReport = {
  productId: string;
  /** Frames the server acknowledged (applied, noop and stale alike). */
  pushed: number;
  /** Frames the server's copy won and this device took back. */
  stale: number;
  /** Rows merged from the server snapshot. */
  pulled: number;
  /** Image files this device uploaded. */
  imagesUp: number;
  /** Image files this device received (fetched or adopted). */
  imagesDown: number;
};

type PageOutcome = {
  page: PullPage;
  more: boolean;
  cursor: string | null;
  /** Highest row `s` in the page, for a diagnostic; never a bookmark. */
  lastSeq: number;
};

/** Drains one scoped snapshot response into a merge page. */
async function collectPage(stream: LineStream): Promise<PageOutcome> {
  const changes: PullChange[] = [];
  let more = false;
  let cursor: string | null = null;
  let lastSeq = -1;

  await consumeLines(stream, (line) => {
    const raw = parseLine(line);
    const frame = parsePullFrame("product", raw);
    if (frame === null) return;
    switch (frame.t) {
      case "meta":
        return;
      case "row":
        changes.push({ seq: frame.s, entity: frame.e, row: frame.r });
        return;
      case "ag":
      case "del":
        // The scoped snapshot never emits these; ignoring them would hide a
        // server bug, so fail instead of silently dropping a change.
        throw new SyncError({
          message: `Server mengirim ${frame.t} pada sinkronisasi satu produk`,
          code: "bad_frame",
        });
      case "done": {
        lastSeq = frame.s;
        more = frame.more === true;
        const next = raw["cursor"];
        cursor = typeof next === "string" && next !== "" ? next : null;
        return;
      }
    }
  });

  return { page: { changes, aggregates: [], deletions: [] }, more, cursor, lastSeq };
}

function pullPage(deps: OneProductDeps, after: string | null): Effect.Effect<PageOutcome, SyncError> {
  return Effect.gen(function* () {
    const stream = deps.transport.productPull(deps.endpoint, {
      productId: deps.productId,
      after,
      limit: pullLimit("product"),
    });

    const outcome = yield* Effect.tryPromise({
      try: () => collectPage(stream),
      catch: (error) =>
        error instanceof SyncError
          ? error
          : new SyncError({
              message: `Sinkronisasi produk gagal dibaca: ${
                error instanceof Error ? error.message : String(error)
              }`,
              code: "bad_frame",
            }),
    }).pipe(Effect.onInterrupt(() => Effect.sync(() => stream.cancel())));

    if (outcome.lastSeq < 0) {
      return yield* Effect.fail(
        new SyncError({
          message: "Server tidak mengirim penanda akhir unduhan produk",
          code: "bad_frame",
        }),
      );
    }
    if (outcome.more && outcome.cursor === null) {
      return yield* Effect.fail(
        new SyncError({
          message: "Server mengirim unduhan lanjutan tanpa posisi",
          code: "bad_frame",
        }),
      );
    }
    return outcome;
  });
}

function pullPageWithRetry(
  deps: OneProductDeps,
  after: string | null,
  attempts = MAX_ATTEMPTS,
): Effect.Effect<PageOutcome, SyncError> {
  const attempt = (remaining: number): Effect.Effect<PageOutcome, SyncError> =>
    pullPage(deps, after).pipe(
      Effect.catchAll((error) => {
        if (remaining <= 1 || !isRetryable(error)) return Effect.fail(error);
        const wait = backoffMs(MAX_ATTEMPTS - remaining);
        return Effect.sleep(`${wait} millis`).pipe(Effect.flatMap(() => attempt(remaining - 1)));
      }),
    );
  return attempt(attempts);
}

/**
 * Push, pull and move bytes for one product.
 *
 * The caller owns the single-flight gate and the endpoint configuration; this
 * function owns the three phases and the report. Failures are `SyncError`s, so
 * the button can show the same sentence the Sinkronisasi screen would.
 */
export function syncOneProduct(deps: OneProductDeps): Effect.Effect<OneProductReport, SyncError> {
  return Effect.gen(function* () {
    const pushed: { pushed: number; stale: number } = yield* push({
      db: deps.db,
      transport: deps.transport,
      endpoint: deps.endpoint,
      group: "product",
      execute: deps.execute,
      productId: deps.productId,
      maxPasses: MAX_PUSH_PASSES,
    });

    let pulled = 0;
    let stale = pushed.stale;
    let after: string | null = null;
    for (let page = 0; page < MAX_PAGES; page += 1) {
      const outcome: PageOutcome = yield* pullPageWithRetry(deps, after);
      const merged = yield* mergePage(
        { db: deps.db, execute: deps.execute },
        "product",
        outcome.page,
        [],
        // No `commit`: a scoped snapshot is not the product group's bookmark.
      );
      pulled += outcome.page.changes.length;
      stale += merged.stats.stale;
      yield* deps.refresh();

      if (!outcome.more) {
        after = null;
        break;
      }
      after = outcome.cursor;
      if (page === MAX_PAGES - 1) {
        return yield* Effect.fail(
          new SyncError({
            message: `Sinkronisasi produk ${deps.productId} terlalu banyak halaman`,
            code: "bad_frame",
          }),
        );
      }
    }

    // Bytes after the rows, in both directions (`SYNC-V2-ONE-PRODUCT.md` §4.2).
    // Neither pass can fail the run: a missing picture is a placeholder.
    const uploads = yield* uploadImageBlobs({ ...deps, productId: deps.productId });
    const fetches = yield* fetchImageBlobs({ ...deps, productId: deps.productId });
    yield* deps.refresh();

    log.info(
      `sync: product ${deps.productId} — ${pushed.pushed} diunggah, ${pulled} diunduh, ${stale} stale, ${uploads.uploaded} gambar naik, ${fetches.fetched + fetches.adopted} gambar turun`,
    );

    return {
      productId: deps.productId,
      pushed: pushed.pushed,
      stale,
      pulled,
      imagesUp: uploads.uploaded,
      imagesDown: fetches.fetched + fetches.adopted,
    };
  });
}
