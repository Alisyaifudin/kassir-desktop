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
 * photos is still a correct catalogue, and the photos follow on a later cycle.
 * That is also why nothing here fails the group: every error is per-image, logged
 * and counted, and the next cycle tries again.
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
 * ## Bounded work
 *
 * A pass uploads or downloads at most `BLOB_LIMIT` images, so a shop's first sync
 * interleaves pictures with the rest of the cycle instead of stalling on them. A
 * catalogue larger than one pass converges over the following cycles, because the
 * predicates are state, not a queue: whatever is still owed is still owed.
 */
import { Context, Effect } from "effect";
import { log } from "~/lib/log";
import type { DatabaseService } from "../db";
import type { Endpoint, SyncTransport } from "./transport";

type DatabaseImpl = Context.Tag.Service<typeof DatabaseService>;

/** How many images one pass may transfer. */
const BLOB_LIMIT = 20;

/** The manifest's page size, and the most pages one pass reads (§8.7.1 limits). */
const MANIFEST_PAGE = 5000;
const MANIFEST_PAGES = 2;

export type ImageBlobDeps = {
  db: DatabaseImpl;
  transport: SyncTransport;
  endpoint: Endpoint;
};

/** What one upload pass did. */
export type UploadReport = {
  /** Files the server now has. */
  uploaded: number;
  /** Rows deliberately left alone: the server's row is gone or its bytes lost LWW. */
  skipped: number;
  /** Rows that failed and will be retried on the next cycle. */
  failed: number;
};

/** What one fetch pass did. */
export type FetchReport = {
  /** Files written to disk from the server. */
  fetched: number;
  /** Files this device already had byte-for-byte: only the bookkeeping moved. */
  adopted: number;
  /** Rows waiting for bytes the server does not have yet (the placeholder case). */
  missing: number;
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
 * The rows this device owes the server (§8.7.1 "needs upload").
 *
 * Three conditions, each load-bearing:
 * `image_sync_at IS NOT NULL` — the row is on the server, so bytes have something
 * to attach to (rows first, then bytes; a row the server has not accepted answers
 * `404 image_unknown`);
 * `image_blob_sync_at IS NULL` — the bytes are not there yet;
 * `image_blob_version = image_updated_at` — the local file is the current
 * version's bytes, which is the only case an upload cannot lie about.
 */
const UPLOAD_SQL = `SELECT image_id, image_name, image_mime, image_updated_at
  FROM images
  WHERE image_deleted_at IS NULL
    AND image_sync_at IS NOT NULL
    AND image_blob_sync_at IS NULL
    AND image_blob_version = image_updated_at
  ORDER BY image_updated_at, image_id
  LIMIT ${BLOB_LIMIT}`;

/**
 * The rows whose local file is not the current version's bytes (§8.7.1 "needs
 * fetch").
 *
 * `IS NOT` is the null-safe comparison: a row that never had bytes
 * (`image_blob_version IS NULL`) is a fetch, and so is one whose clock moved past
 * its file. A row that already claims the current version is **not** a candidate —
 * it is either an upload (no digest yet) or a picture this device already has, and
 * walking the manifest for those would cost a request per pull page on every till
 * that has pictures of its own.
 */
const FETCH_SQL = `SELECT image_id, image_name, image_updated_at, image_blob_sha256
  FROM images
  WHERE image_deleted_at IS NULL
    AND image_blob_version IS NOT image_updated_at
  ORDER BY image_id`;

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
    const rows = yield* deps.db.selectMany<UploadRow>(UPLOAD_SQL);
    if (rows.length === 0) return { uploaded: 0, skipped: 0, failed: 0 };

    const statements: { sql: string; bindings: (string | number | null)[] }[] = [];
    let uploaded = 0;
    let skipped = 0;
    let failed = 0;

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
        continue;
      }

      const code = codeOf(outcome.left);
      if (code === "local_missing") {
        // The row was never this device's picture — it was pulled, and its bytes
        // are somewhere else. The version it claimed is a lie, so it goes.
        statements.push(forgetFile(row.image_id, row.image_updated_at));
        skipped += 1;
        continue;
      }
      if (code === "blob_conflict") {
        statements.push(forgetFile(row.image_id, row.image_updated_at));
        skipped += 1;
        log.info(`sync: gambar ${row.image_id} sudah ada versi lain di server — mengikuti server`);
        continue;
      }
      if (code === "image_unknown" || code === "image_deleted") {
        // The server's row is missing or tombstoned. The next pull settles which
        // copy is current, so nothing is written here.
        skipped += 1;
        continue;
      }

      failed += 1;
      log.error(
        new Error(
          `sync: upload gambar ${row.image_id} gagal (${code || "?"}): ${messageOf(outcome.left)}`,
        ),
      );
    }

    if (statements.length > 0) yield* deps.db.transaction(statements);
    return { uploaded, skipped, failed };
  }).pipe(
    // Bytes are a cache of the row: a failure here must never fail the group, or
    // one bad picture would block a catalogue that is already on disk.
    Effect.catchAllCause((cause) =>
      Effect.sync(() => {
        log.error(new Error(`sync: pass unggah gambar gagal: ${String(cause)}`));
        return { uploaded: 0, skipped: 0, failed: 0 };
      }),
    ),
  );
}

/** Reads the whole manifest (two pages at most) into an `image_id` lookup. */
function readManifest(
  deps: ImageBlobDeps,
): Effect.Effect<Map<string, { version: number; sha256: string }>, unknown> {
  return Effect.gen(function* () {
    const byId = new Map<string, { version: number; sha256: string }>();
    let after: string | null = null;
    for (let page = 0; page < MANIFEST_PAGES; page += 1) {
      const body = yield* Effect.tryPromise({
        try: () => deps.transport.blobManifest(deps.endpoint, { after, limit: MANIFEST_PAGE }),
        catch: (error: unknown) => error,
      });
      for (const blob of body.blobs) {
        byId.set(blob.imageId, { version: blob.version, sha256: blob.sha256 });
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
    const rows = yield* deps.db.selectMany<FetchRow>(FETCH_SQL);
    if (rows.length === 0) return { fetched: 0, adopted: 0, missing: 0 };

    const manifest = yield* readManifest(deps);
    const statements: { sql: string; bindings: (string | number | null)[] }[] = [];
    let fetched = 0;
    let adopted = 0;
    let missing = 0;
    let downloads = 0;

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
        continue;
      }
      if (downloads >= BLOB_LIMIT) continue;

      const outcome = yield* Effect.tryPromise({
        try: () =>
          deps.transport.blobGet(deps.endpoint, {
            sha256: entry.sha256,
            fileName: row.image_name,
          }),
        catch: (error: unknown) => error,
      }).pipe(Effect.either);

      downloads += 1;
      if (outcome._tag === "Left") {
        // `blob_missing` means the manifest was stale (the object was collected for
        // a version nobody serves any more): the row keeps its state and the next
        // manifest call tells the truth.
        missing += 1;
        log.error(
          new Error(
            `sync: unduh gambar ${row.image_id} gagal (${codeOf(outcome.left) || "?"}): ${messageOf(outcome.left)}`,
          ),
        );
        continue;
      }

      statements.push(markStored(row.image_id, row.image_updated_at, entry.sha256, Date.now()));
      fetched += 1;
    }

    if (statements.length > 0) yield* deps.db.transaction(statements);
    return { fetched, adopted, missing };
  }).pipe(
    Effect.catchAllCause((cause) =>
      Effect.sync(() => {
        log.error(new Error(`sync: pass unduh gambar gagal: ${String(cause)}`));
        return { fetched: 0, adopted: 0, missing: 0 };
      }),
    ),
  );
}
