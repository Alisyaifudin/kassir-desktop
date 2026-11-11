/**
 * The product group's image bytes (`SYNC-V2.md` §2.10, §8.7.1).
 *
 * An `image` **row** is an ordinary catalog row: it travels in
 * `product_group_change_log`, costs a `seq`, moves the bookmark, and merges by
 * plain LWW. Its **bytes** are a different channel entirely — content-addressed
 * objects behind three routes, no `seq`, no log entry, no bookmark. This file is
 * the client's whole participation in that channel, and it is deliberately two
 * small passes rather than a third sync loop:
 *
 * ```
 * push rows, then bytes     upload:  PUT /v2/product/image/blob/:id?version=…
 * after the page commits    fetch:   GET /v2/product/image/manifest, then GET /v2/blob/:sha256
 * ```
 *
 * ## Why bytes never gate the bookmark
 *
 * The bookmark is written inside the page's transaction (§9.4.1) and these passes
 * run **after** it. A missing picture is a placeholder, never a page failure, and
 * never a reason to hold the group back — a catalogue that arrives without its
 * photos is still a correct catalogue, and the bytes that are still missing when
 * the pages end are drained before the run finishes (§ "One run leaves a full
 * copy"). That is also why nothing here fails the group: every error is per-image,
 * logged and counted, and the next cycle tries again.
 *
 * ## The state that decides everything
 *
 * Three client-only columns on `images` (migration-50), never on the wire:
 *
 * | column | meaning |
 * | --- | --- |
 * | `image_blob_version` | the `image_updated_at` the local file belongs to; `NULL` = no file this device can vouch for |
 * | `image_blob_sha256` | sha256 of that file, as the server reported it |
 * | `image_blob_sync_at` | `NULL` = the bytes were never accepted by the server |
 *
 * Two facts drive the two predicates below, and both come from the contract:
 *
 * - **An upload is only for bytes this device produced.** `image_blob_version`
 *   equals the row's current clock. The app sets it when it writes a file (and
 *   re-sets it on a metadata-only edit, which bumps the clock without changing the
 *   bytes) — a pulled row keeps whatever its own device recorded, so a device can
 *   never upload a stale picture under a newer version.
 * - **The row's own clock decides which bytes are current.** A manifest entry that
 *   names a different `version` than the local row describes bytes for a row this
 *   device has not merged yet, so it is skipped rather than downloaded.
 *
 * ## Where the files live
 *
 * `AppData/images/{image_name}`, the key the rest of the app already reads by
 * (`src/lib/image.ts`, `useImageUrl`). §8.7.1 allows this — a device that keys
 * files by `image_name` may keep doing so as long as a collision is resolved by
 * `image_id` — and here collisions cannot happen at all: the gallery mints the
 * name as `${image_id}-${original}`, so two pictures never share one. The bytes
 * of a pulled row are written under that row's own `image_name`, which is the
 * value its readers will use.
 *
 * ## One run leaves a full copy
 *
 * A *pass* moves at most `BLOB_LIMIT` images, so no single request batch grows
 * into a stall and a page is never held back by pictures. A **run** does not stop
 * at one pass: `uploadImageBlobs` and `fetchImageBlobs` loop passes until nothing
 * is owed (`MAX_PASSES` is only a runaway guard). A first sync of a catalogue
 * therefore ends with every picture on the device — a sync that leaves twenty
 * files behind per press is not a sync, it is a queue the operator drains by
 * hand.
 *
 * The loop stops early when a pass resolved nothing: the rows it selected are
 * still owed and still unchangeable this cycle (the server's row is gone, the
 * file is missing), so another pass would select the same rows forever.
 */
import { Context, Effect } from "effect";
import { image } from "~/lib/image";
import { log } from "~/lib/log";
import type { DatabaseService } from "../db";
import type { Endpoint, SyncTransport } from "./transport";

type DatabaseImpl = Context.Tag.Service<typeof DatabaseService>;

/** How many images one pass may transfer. */
const BLOB_LIMIT = 20;

/**
 * Passes one call may run, in each direction.
 *
 * A runaway guard, not a budget: 500 passes is 10.000 files, beyond any shop's
 * gallery, and the loop normally ends on an empty pass long before. It exists so a
 * server that keeps answering "select these rows again" cannot pin the run open
 * forever.
 */
const MAX_PASSES = 500;

/** The manifest's page size, and the most pages one pass reads (§8.7.1 limits). */
const MANIFEST_PAGE = 5000;
const MANIFEST_PAGES = 2;

export type ImageBlobDeps = {
  db: DatabaseImpl;
  transport: SyncTransport;
  endpoint: Endpoint;
  /**
   * Optional scope for the one-product manual sync (`SYNC-V2-ONE-PRODUCT.md`
   * §4). Omit it for the full cycle, which moves every image this device owes.
   */
  productId?: string;
  /** One tick per file, so the screen can show which of twenty is in flight. */
  onProgress?: (tick: BlobTick) => void;
  /**
   * How many passes this call may run (default `MAX_PASSES`).
   *
   * The cycle asks the *per-page* fetch for exactly one pass: a pull page must not
   * wait behind a thousand photographs. The drain at the end of the pull sequence
   * then takes the whole budget, which is what leaves a full copy after one run.
   */
  maxPasses?: number;
};

/**
 * What one image pass has moved so far.
 *
 * `bytes`/`bytesTotal` are the display half — a shop whose catalogue is pictures
 * needs to see the megabytes, not just "3 of 20". `bytesTotal` is `null` when a
 * size is not known up front: a missing local file, or a manifest that does not
 * list one of the rows.
 */
export type BlobTick = {
  /** Files finished in this pass (whatever the outcome). */
  done: number;
  /** Files this pass will attempt. */
  total: number;
  /** Bytes moved so far in this pass. */
  bytes: number;
  /** Bytes this pass expects to move, when every size is known. */
  bytesTotal: number | null;
  /**
   * The file this tick is about — the row's `image_name`, or `null` when the row
   * has none. The screen's log names the picture, so a pass of twenty reads as
   * twenty files instead of twenty counts.
   */
  name: string | null;
  /**
   * What happened to that file.
   *
   * Without it every outcome printed the same sentence, so a pass that *skipped*
   * twenty files (a missing local copy, or the server already holding other bytes)
   * was indistinguishable from one that uploaded twenty — and a run that moved
   * nothing looked like a run that was retrying the same pictures.
   */
  outcome: BlobOutcome;
};

/** What one file's turn in a pass did. */
export type BlobOutcome = "ok" | "skipped" | "failed";

/** What one upload pass did. */
export type UploadReport = {
  /** Files the server now has. */
  uploaded: number;
  /** Rows deliberately left alone: the server's row is gone or its bytes lost LWW. */
  skipped: number;
  /** Rows that failed and will be retried on the next cycle. */
  failed: number;
  /** Bytes accepted by the server in this pass. */
  bytes: number;
};

/** What one fetch pass did. */
export type FetchReport = {
  /** Files written to disk from the server. */
  fetched: number;
  /** Files this device already had byte-for-byte: only the bookkeeping moved. */
  adopted: number;
  /** Rows waiting for bytes the server does not have yet (the placeholder case). */
  missing: number;
  /** Bytes written to disk in this pass. */
  bytes: number;
};

/** An image row owed to the server, and the local file that holds its bytes. */
type UploadRow = {
  image_id: string;
  image_name: string;
  image_mime: string;
  image_updated_at: number;
};

/** An image row whose local file is not the current version's bytes. */
type FetchRow = {
  image_id: string;
  image_name: string;
  image_updated_at: number;
  image_blob_sha256: string | null;
};

/**
 * The `WHERE` half of "needs upload": the three predicates, in one place.
 *
 * Three conditions, each load-bearing:
 * `image_sync_at IS NOT NULL` — the row is on the server, so bytes have something
 * to attach to (rows first, then bytes; a row the server has not accepted answers
 * `404 image_unknown`);
 * `image_blob_sync_at IS NULL` — the bytes are not there yet;
 * `image_blob_version = image_updated_at` — the local file is the current
 * version's bytes, which is the only case an upload cannot lie about.
 *
 * Shared with `countImageBlobs` rather than repeated: a count that disagrees with
 * the pass it sizes is a bar that never reaches 100%.
 */
const UPLOAD_WHERE = `image_deleted_at IS NULL
    AND image_sync_at IS NOT NULL
    AND image_blob_sync_at IS NULL
    AND image_blob_version = image_updated_at`;

/**
 * The `WHERE` half of "needs fetch" (§8.7.1).
 *
 * `IS NOT` is the null-safe comparison: a row that never had bytes
 * (`image_blob_version IS NULL`) is a fetch, and so is one whose clock moved past
 * its file. A row that already claims the current version is **not** a candidate —
 * it is either an upload (no digest yet) or a picture this device already has, and
 * walking the manifest for those would cost a request per pull page on every till
 * that has pictures of its own.
 */
const FETCH_WHERE = `image_deleted_at IS NULL
    AND image_blob_version IS NOT image_updated_at`;

/** The rows this device owes the server (§8.7.1 "needs upload"), newest clock first. */
function uploadSql(productId: string | undefined): string {
  return `SELECT image_id, image_name, image_mime, image_updated_at
  FROM images
  WHERE ${UPLOAD_WHERE}
    ${productId === undefined ? "" : "AND product_id = $1"}
  ORDER BY image_updated_at, image_id
  LIMIT ${BLOB_LIMIT}`;
}

/** The rows whose local file is not the current version's bytes (§8.7.1 "needs fetch"). */
function fetchSql(productId: string | undefined): string {
  return `SELECT image_id, image_name, image_updated_at, image_blob_sha256
  FROM images
  WHERE ${FETCH_WHERE}
    ${productId === undefined ? "" : "AND product_id = $1"}
  ORDER BY image_id`;
}

/**
 * How many image files each direction of the byte channel still owes.
 *
 * The **whole backlog**, because the run moves the whole backlog: the bar is
 * sized to the files that will cross, and the summary says how many are left. An
 * earlier version capped these at one pass so the bar would be "proportioned",
 * which made a run that moved twenty files look like a run that moved everything
 * — the number has to describe the work, not the batch.
 */
export function countImageBlobs(
  db: DatabaseImpl,
  productId?: string,
): Effect.Effect<{ up: number; down: number }> {
  const count = (where: string): Effect.Effect<number> =>
    db
      .selectMany<{ total: number }>(
        `SELECT COUNT(*) AS total FROM images WHERE ${where}
           ${productId === undefined ? "" : "AND product_id = $1"}`,
        productId === undefined ? undefined : [productId],
      )
      .pipe(
        Effect.map((rows) => rows[0]?.total ?? 0),
        // A zero here plans a zero-work cycle and reads as "nothing owed" —
        // images silently stop flowing with no explanation, so it is recorded.
        Effect.tapErrorTag("DbError", (error) =>
          Effect.sync(() =>
            log.error(`sync: gagal menghitung gambar yang tertunggak: ${error.detail}`),
          ),
        ),
        Effect.orElseSucceed(() => 0),
      );
  return Effect.all(
    {
      up: count(UPLOAD_WHERE),
      down: count(FETCH_WHERE),
    },
    { concurrency: 1 },
  );
}

/**
 * Records that this image's bytes for `version` are on the server.
 *
 * Guarded by `image_updated_at = $1`, so a row edited while the request was in
 * flight keeps its old bookkeeping and is handled again: the same compare-and-set
 * an ack uses (§4.12), for the same reason.
 */
function markStored(
  imageId: string,
  version: number,
  sha256: string,
  at: number,
): { sql: string; bindings: (string | number | null)[] } {
  return {
    sql: `UPDATE images SET
        image_blob_version = $1, image_blob_sha256 = $2, image_blob_sync_at = $3
      WHERE image_id = $4 AND image_updated_at = $1`,
    bindings: [version, sha256, at, imageId],
  };
}

/**
 * Forgets which version the local file belongs to, which turns the row into a
 * fetch on the next pass.
 *
 * Used when the file is not on this device (`local_missing`) and when the server
 * owns different bytes for the same `(image_id, version)` (`409 blob_conflict`).
 * The second case is the contract's conflict rule: the stored copy wins, this
 * device adopts it, and its own crop — if the user still wants it — becomes a new
 * edit with a new clock, never a clock bumped in a loop (§8.7.1).
 */
function forgetFile(
  imageId: string,
  version: number,
): { sql: string; bindings: (string | number | null)[] } {
  return {
    sql: `UPDATE images SET
        image_blob_version = NULL, image_blob_sha256 = NULL, image_blob_sync_at = NULL
      WHERE image_id = $1 AND image_updated_at = $2`,
    bindings: [imageId, version],
  };
}

/** The documented error codes this side branches on. */
function codeOf(error: unknown): string {
  if (typeof error === "object" && error !== null) {
    const candidate = error as { code?: unknown };
    if (typeof candidate.code === "string") return candidate.code;
  }
  return "";
}

function messageOf(error: unknown): string {
  if (typeof error === "object" && error !== null) {
    const candidate = error as { message?: unknown };
    if (typeof candidate.message === "string") return candidate.message;
  }
  return String(error);
}

/**
 * Uploads the images this device owes the server.
 *
 * Runs **after** the group's push, so every row it touches has an ack (§8.7.1
 * "rows, then bytes"). One image's refusal never stops the next one: the four
 * cases are a missing local file (forget the version, fetch it later), a row the
 * server does not have or has deleted (leave it for the pull), a losing upload
 * (`409 blob_conflict` — adopt the server's copy) and a genuine failure (retry next
 * cycle).
 */
export function uploadImageBlobs(deps: ImageBlobDeps): Effect.Effect<UploadReport> {
  return Effect.gen(function* () {
    // Cumulative across passes: the screen shows one byte counter for the whole
    // drain, and the report belongs to the call, not to its last pass.
    let uploaded = 0;
    let skipped = 0;
    let failed = 0;
    let bytes = 0;
    /** Known byte total so far; `null` once any pass could not size a file. */
    let bytesTotal: number | null = 0;

    const maxPasses = deps.maxPasses ?? MAX_PASSES;
    for (let pass = 0; pass < maxPasses; pass += 1) {
      const rows = yield* deps.db.selectMany<UploadRow>(
        uploadSql(deps.productId),
        deps.productId === undefined ? undefined : [deps.productId],
      );
      // An empty pass is the drain signal: nothing is owed, so the loop is done.
      if (rows.length === 0) break;

      // What *this pass* will put on the wire. The sizes are on disk, not in the
      // row, so they are read before the first upload rather than discovered from
      // each answer — a byte counter that only ever shows its own past is not a
      // bar. One missing file makes this pass `null`: a partial total under a byte
      // counter is worse than none, and that file is about to answer
      // `local_missing` anyway.
      let passTotal: number | null = 0;
      for (const row of rows) {
        const size = yield* image.size(row.image_name).pipe(
          // A missing file is the expected `local_missing` case, but a failed
          // stat is indistinguishable from it here — recorded so a disk problem
          // does not hide behind "file not found".
          Effect.tapErrorTag("IOError", (error) =>
            Effect.sync(() =>
              log.info(`sync: gagal membaca ukuran gambar ${row.image_name}: ${error.e.message}`),
            ),
          ),
          Effect.orElseSucceed(() => null),
        );
        if (size === null) {
          passTotal = null;
          break;
        }
        passTotal += size;
      }
      bytesTotal = bytesTotal === null || passTotal === null ? null : bytesTotal + passTotal;

      const statements: { sql: string; bindings: (string | number | null)[] }[] = [];
      let done = 0;
      /**
       * Rows whose state this pass actually changed.
       *
       * A statement is what removes a row from the predicate, so a `skipped` row
       * with nothing written is *not* progress: an `image_unknown` row keeps
       * matching the upload predicate, and another pass would select it forever.
       */
      let changed = 0;
      const tick = (name: string | null, outcome: BlobOutcome): void => {
        done += 1;
        deps.onProgress?.({ done, total: rows.length, bytes, bytesTotal, name, outcome });
      };

      for (const row of rows) {
        const outcome = yield* Effect.tryPromise({
          try: () =>
            deps.transport.blobPut(deps.endpoint, {
              imageId: row.image_id,
              version: row.image_updated_at,
              fileName: row.image_name,
              mime: row.image_mime,
            }),
          catch: (error: unknown) => error,
        }).pipe(Effect.either);

        if (outcome._tag === "Right") {
          statements.push(
            markStored(row.image_id, row.image_updated_at, outcome.right.sha256, Date.now()),
          );
          uploaded += 1;
          changed += 1;
          bytes += outcome.right.byteSize;
          tick(row.image_name, "ok");
          continue;
        }

        const code = codeOf(outcome.left);
        if (code === "local_missing") {
          // The row was never this device's picture — it was pulled, and its bytes
          // are somewhere else. The version it claimed is a lie, so it goes.
          statements.push(forgetFile(row.image_id, row.image_updated_at));
          skipped += 1;
          changed += 1;
          tick(row.image_name, "skipped");
          continue;
        }
        if (code === "blob_conflict") {
          statements.push(forgetFile(row.image_id, row.image_updated_at));
          skipped += 1;
          changed += 1;
          tick(row.image_name, "skipped");
          log.info(`sync: gambar ${row.image_id} sudah ada versi lain di server — mengikuti server`);
          continue;
        }
        if (code === "image_unknown" || code === "image_deleted") {
          // The server's row is missing or tombstoned. The next pull settles which
          // copy is current, so nothing is written here — and nothing changed, which
          // is why this does not count as progress.
          skipped += 1;
          tick(row.image_name, "skipped");
          continue;
        }

        failed += 1;
        tick(row.image_name, "failed");
        log.error(
          new Error(
            `sync: upload gambar ${row.image_id} gagal (${code || "?"}): ${messageOf(outcome.left)}`,
          ),
        );
      }

      if (statements.length > 0) yield* deps.db.transaction(statements);
      // A pass that changed nothing selected rows this cycle cannot change — a
      // tombstoned row, a file that is gone, a server that keeps answering 500.
      // Another pass would pick the same rows and spin; the next cycle retries.
      if (changed === 0) break;
    }

    return { uploaded, skipped, failed, bytes };
  }).pipe(
    // Bytes are a cache of the row: a failure here must never fail the group, or
    // one bad picture would block a catalogue that is already on disk.
    Effect.catchAllCause((cause) =>
      Effect.sync(() => {
        log.error(new Error(`sync: unggah gambar gagal: ${String(cause)}`));
        return { uploaded: 0, skipped: 0, failed: 0, bytes: 0 };
      }),
    ),
  );
}

/**
 * Reads the whole manifest (two pages at most) into an `image_id` lookup.
 *
 * `byteSize` is carried along because it is the only place a pull's byte total
 * exists before the first file arrives: the server states what each blob weighs.
 */
function readManifest(
  deps: ImageBlobDeps,
): Effect.Effect<Map<string, { version: number; sha256: string; byteSize: number }>, unknown> {
  return Effect.gen(function* () {
    const byId = new Map<string, { version: number; sha256: string; byteSize: number }>();
    let after: string | null = null;
    for (let page = 0; page < MANIFEST_PAGES; page += 1) {
      const body = yield* Effect.tryPromise({
        try: () =>
          deps.transport.blobManifest(deps.endpoint, {
            after,
            limit: MANIFEST_PAGE,
            ...(deps.productId === undefined ? {} : { productId: deps.productId }),
          }),
        catch: (error: unknown) => error,
      });
      for (const blob of body.blobs) {
        byId.set(blob.imageId, {
          version: blob.version,
          sha256: blob.sha256,
          byteSize: blob.byteSize,
        });
      }
      if (!body.more || body.next === null) break;
      after = body.next;
    }
    return byId;
  });
}

/**
 * Fetches the bytes this device is missing, after a page has committed.
 *
 * The manifest is a join, not a log: it lists the bytes of a live image row whose
 * blob version equals that row's `image_updated_at` **on the server**. So an entry
 * whose `version` differs from the local row's clock describes a row this device
 * has not merged yet, and downloading it would store the wrong picture for this
 * clock — it is skipped, and the merge that arrives later makes it match.
 */
export function fetchImageBlobs(deps: ImageBlobDeps): Effect.Effect<FetchReport> {
  return Effect.gen(function* () {
    // Cumulative across passes: one byte counter for the whole drain.
    let fetched = 0;
    let adopted = 0;
    let missing = 0;
    let bytes = 0;
    /** Known byte total so far; the manifest sizes every file it lists. */
    let bytesTotal = 0;

    const maxPasses = deps.maxPasses ?? MAX_PASSES;
    for (let pass = 0; pass < maxPasses; pass += 1) {
      const rows = yield* deps.db.selectMany<FetchRow>(
        fetchSql(deps.productId),
        deps.productId === undefined ? undefined : [deps.productId],
      );
      // An empty pass is the drain signal: every file this device can vouch for is
      // already on disk.
      if (rows.length === 0) break;

      const manifest = yield* readManifest(deps);
      const statements: { sql: string; bindings: (string | number | null)[] }[] = [];

      // What *this pass* will download, decided before the first request so the bar
      // has a denominator while the first photo is still arriving. The same three
      // tests the loop below applies, in the same order (which is what makes the
      // per-pass cap land on the same rows), plus the sizes from the manifest —
      // the one place a byte total for a pull exists before it starts.
      let planned = 0;
      let passTotal = 0;
      for (const row of rows) {
        if (planned >= BLOB_LIMIT) break;
        const entry = manifest.get(row.image_id);
        if (entry === undefined) continue;
        if (entry.version !== row.image_updated_at) continue;
        if (row.image_blob_sha256 === entry.sha256) continue;
        planned += 1;
        passTotal += entry.byteSize;
      }
      bytesTotal += passTotal;

      let done = 0;
      /**
       * Rows whose state this pass actually changed.
       *
       * A statement is what removes a row from the predicate, so a `skipped` row
       * with nothing written is *not* progress: an `image_unknown` row keeps
       * matching the upload predicate, and another pass would select it forever.
       */
      let changed = 0;
      const tick = (name: string | null, outcome: BlobOutcome): void => {
        done += 1;
        deps.onProgress?.({ done, total: planned, bytes, bytesTotal, name, outcome });
      };

      for (const row of rows) {
        const entry = manifest.get(row.image_id);
        if (entry === undefined) {
          // No bytes on the server for this row: a placeholder, not a failure, and
          // not a download — that is what keeps a shop with pictures only on one
          // till from asking for them forever.
          missing += 1;
          continue;
        }
        if (entry.version !== row.image_updated_at) continue;

        // The server's bytes for exactly this version. If this device already holds
        // that byte sequence (a reorder elsewhere moved the clock, not the picture),
        // only the bookkeeping moves: no download, and the bytes are already on the
        // server, so they must never be uploaded again.
        if (row.image_blob_sha256 === entry.sha256) {
          statements.push(markStored(row.image_id, row.image_updated_at, entry.sha256, Date.now()));
          adopted += 1;
          changed += 1;
          continue;
        }
        // Everything above is bookkeeping; this is the pass's cap — a page is never
        // held back by pictures, and the drain at the end of the pull takes the
        // rest.
        if (done >= BLOB_LIMIT) continue;

        const outcome = yield* Effect.tryPromise({
          try: () =>
            deps.transport.blobGet(deps.endpoint, {
              sha256: entry.sha256,
              fileName: row.image_name,
            }),
          catch: (error: unknown) => error,
        }).pipe(Effect.either);

        if (outcome._tag === "Left") {
          // `blob_missing` means the manifest was stale (the object was collected for
          // a version nobody serves any more): the row keeps its state and the next
          // manifest call tells the truth.
          missing += 1;
          tick(row.image_name, "skipped");
          log.error(
            new Error(
              `sync: unduh gambar ${row.image_id} gagal (${codeOf(outcome.left) || "?"}): ${messageOf(outcome.left)}`,
            ),
          );
          continue;
        }

        statements.push(markStored(row.image_id, row.image_updated_at, entry.sha256, Date.now()));
        fetched += 1;
        changed += 1;
        bytes += outcome.right.byteSize;
        tick(row.image_name, "ok");
      }

      if (statements.length > 0) yield* deps.db.transaction(statements);
      // Nothing changed means nothing will change this cycle: a stale manifest, a
      // manifest entry for a version this device has not merged yet, or a file the
      // server no longer serves.
      if (changed === 0) break;
    }

    return { fetched, adopted, missing, bytes };
  }).pipe(
    Effect.catchAllCause((cause) =>
      Effect.sync(() => {
        log.error(new Error(`sync: unduh gambar gagal: ${String(cause)}`));
        return { fetched: 0, adopted: 0, missing: 0, bytes: 0 };
      }),
    ),
  );
}
