/**
 * The combo group's cover bytes (`SYNC-V2.md` §8.7.1, §8.9).
 *
 * A combo ROW carries `combo_cover_name` and `combo_cover_mime` and travels in
 * `combo_group_change_log` like the rest of the aggregate. Its **bytes** are a
 * different channel — content-addressed objects behind three routes, no `seq`,
 * no log entry, no bookmark. This module is the combo twin of `blob.ts`, and the
 * shape is deliberately identical so there is one mental model for both:
 *
 * ```
 * push rows, then bytes     upload:  PUT /v2/combo/cover/blob/:id?version=…
 * after the page commits    fetch:   GET /v2/combo/cover/manifest, then GET /v2/blob/:sha256
 * ```
 *
 * ## The state that decides everything
 *
 * Three client-only columns on `combos` (migration-60), never on the wire:
 *
 * | column | meaning |
 * | --- | --- |
 * | `combo_cover_blob_version` | the `combo_updated_at` the local file belongs to; `NULL` = no cover file this device can vouch for |
 * | `combo_cover_blob_sha256` | sha256 of that file, as the server reported it |
 * | `combo_cover_blob_sync_at` | `NULL` = the cover bytes were never accepted |
 *
 * The two predicates below follow from those, exactly as the image channel's do:
 * an upload only for bytes this device produced at the current clock, and a
 * fetch only when the row's clock has moved past its file.
 *
 * ## Why the clock is the version
 *
 * A combo save replaces the aggregate and bumps `combo_updated_at` even when the
 * cover file did not change. `ComboService.set.info` therefore carries
 * `combo_cover_blob_version` forward on such a save, and the server does the
 * same for its claim (`carryComboCoverClaim`); otherwise every save would make
 * the cover read as "no bytes yet" and draw a placeholder.
 *
 * ## Where the files live
 *
 * `AppData/images/{combo_cover_name}`, the same folder the product gallery and
 * the combo form use (`src/lib/image.ts`). The form mints the name as
 * `${id}-${original}`, so a name identifies one byte sequence and two combos
 * never share a file.
 *
 * ## One run leaves a full copy
 *
 * Like the image channel, a *pass* is bounded (`BLOB_LIMIT`) so a page is never
 * held back by pictures, and a **run** loops passes until nothing is owed. A
 * pass that changed nothing stops the loop: the rows it selected cannot change
 * this cycle (a missing local file, a tombstone, a server error).
 */
import { Context, Effect } from "effect";
import { image } from "~/lib/image";
import { log } from "~/lib/log";
import type { DatabaseService } from "../db";
import type { BlobOutcome, BlobTick, FetchReport, UploadReport } from "./blob";
import type { Endpoint, SyncTransport } from "./transport";

type DatabaseImpl = Context.Tag.Service<typeof DatabaseService>;

/** How many covers one pass may transfer. */
const BLOB_LIMIT = 20;

/** A runaway guard, not a budget: 500 passes is 10.000 files. */
const MAX_PASSES = 500;

/** The manifest's page size, and the most pages one pass reads. */
const MANIFEST_PAGE = 5000;
const MANIFEST_PAGES = 2;

export type ComboCoverDeps = {
  db: DatabaseImpl;
  transport: SyncTransport;
  endpoint: Endpoint;
  /** One tick per file, so the screen can show which cover is in flight. */
  onProgress?: (tick: BlobTick) => void;
  /** How many passes this call may run (default `MAX_PASSES`). */
  maxPasses?: number;
};

/** A combo cover owed to the server, and the local file that holds its bytes. */
type UploadRow = {
  combo_id: string;
  combo_cover_name: string;
  combo_cover_mime: string;
  combo_updated_at: number;
};

/** A combo cover whose local file is not the current version's bytes. */
type FetchRow = {
  combo_id: string;
  combo_cover_name: string;
  combo_updated_at: number;
  combo_cover_blob_sha256: string | null;
};

/**
 * The `WHERE` half of "needs upload": the row is on the server (`combo_sync_at
 * IS NOT NULL`), the cover bytes are not, and the local file is the current
 * version's bytes.
 */
const UPLOAD_WHERE = `combo_deleted_at IS NULL
    AND combo_cover_name IS NOT NULL
    AND combo_sync_at IS NOT NULL
    AND combo_cover_blob_sync_at IS NULL
    AND combo_cover_blob_version = combo_updated_at`;

/**
 * The `WHERE` half of "needs fetch": a live combo with a cover whose file is not
 * the current version's bytes. A row that already claims the current version is
 * not a candidate — it is either an upload or a cover this device already has.
 */
const FETCH_WHERE = `combo_deleted_at IS NULL
    AND combo_cover_name IS NOT NULL
    AND combo_cover_blob_version IS NOT combo_updated_at`;

const UPLOAD_SQL = `SELECT combo_id, combo_cover_name, combo_cover_mime, combo_updated_at
  FROM combos
  WHERE ${UPLOAD_WHERE}
  ORDER BY combo_updated_at, combo_id
  LIMIT ${BLOB_LIMIT}`;

const FETCH_SQL = `SELECT combo_id, combo_cover_name, combo_updated_at, combo_cover_blob_sha256
  FROM combos
  WHERE ${FETCH_WHERE}
  ORDER BY combo_id`;

/** How many cover files each direction still owes. */
export function countComboCoverBlobs(
  db: DatabaseImpl,
): Effect.Effect<{ up: number; down: number }> {
  const count = (where: string): Effect.Effect<number> =>
    db
      .selectMany<{ total: number }>(`SELECT COUNT(*) AS total FROM combos WHERE ${where}`)
      .pipe(
        Effect.map((rows) => rows[0]?.total ?? 0),
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

/** Records that this combo's cover bytes for `version` are on the server. */
function markStored(
  comboId: string,
  version: number,
  sha256: string,
  at: number,
): { sql: string; bindings: (string | number | null)[] } {
  return {
    sql: `UPDATE combos SET
        combo_cover_blob_version = $1, combo_cover_blob_sha256 = $2, combo_cover_blob_sync_at = $3
      WHERE combo_id = $4 AND combo_updated_at = $1`,
    bindings: [version, sha256, at, comboId],
  };
}

/**
 * Forgets which version the local file belongs to, turning the row into a fetch
 * on the next pass. Used for a missing local file and a losing upload
 * (`409 blob_conflict`), exactly like the image channel.
 */
function forgetFile(
  comboId: string,
  version: number,
): { sql: string; bindings: (string | number | null)[] } {
  return {
    sql: `UPDATE combos SET
        combo_cover_blob_version = NULL, combo_cover_blob_sha256 = NULL,
        combo_cover_blob_sync_at = NULL
      WHERE combo_id = $1 AND combo_updated_at = $2`,
    bindings: [comboId, version],
  };
}

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

/** Uploads the combo covers this device owes the server. */
export function uploadComboCoverBlobs(deps: ComboCoverDeps): Effect.Effect<UploadReport> {
  return Effect.gen(function* () {
    let uploaded = 0;
    let skipped = 0;
    let failed = 0;
    let bytes = 0;
    let bytesTotal: number | null = 0;

    const maxPasses = deps.maxPasses ?? MAX_PASSES;
    for (let pass = 0; pass < maxPasses; pass += 1) {
      const rows = yield* deps.db.selectMany<UploadRow>(UPLOAD_SQL);
      if (rows.length === 0) break;

      let passTotal: number | null = 0;
      for (const row of rows) {
        const size = yield* image
          .size(row.combo_cover_name)
          .pipe(Effect.orElseSucceed(() => null));
        if (size === null) {
          passTotal = null;
          break;
        }
        passTotal += size;
      }
      bytesTotal = bytesTotal === null || passTotal === null ? null : bytesTotal + passTotal;

      const statements: { sql: string; bindings: (string | number | null)[] }[] = [];
      let done = 0;
      let changed = 0;
      const tick = (name: string | null, outcome: BlobOutcome): void => {
        done += 1;
        deps.onProgress?.({ done, total: rows.length, bytes, bytesTotal, name, outcome });
      };

      for (const row of rows) {
        const outcome = yield* Effect.tryPromise({
          try: () =>
            deps.transport.comboCoverPut(deps.endpoint, {
              comboId: row.combo_id,
              version: row.combo_updated_at,
              fileName: row.combo_cover_name,
              mime: row.combo_cover_mime,
            }),
          catch: (error: unknown) => error,
        }).pipe(Effect.either);

        if (outcome._tag === "Right") {
          statements.push(
            markStored(row.combo_id, row.combo_updated_at, outcome.right.sha256, Date.now()),
          );
          uploaded += 1;
          changed += 1;
          bytes += outcome.right.byteSize;
          tick(row.combo_cover_name, "ok");
          continue;
        }

        const code = codeOf(outcome.left);
        if (code === "local_missing") {
          statements.push(forgetFile(row.combo_id, row.combo_updated_at));
          skipped += 1;
          changed += 1;
          tick(row.combo_cover_name, "skipped");
          continue;
        }
        if (code === "blob_conflict") {
          statements.push(forgetFile(row.combo_id, row.combo_updated_at));
          skipped += 1;
          changed += 1;
          tick(row.combo_cover_name, "skipped");
          log.info(
            `sync: sampul combo ${row.combo_id} sudah ada versi lain di server — mengikuti server`,
          );
          continue;
        }
        if (
          code === "combo_unknown" ||
          code === "combo_deleted" ||
          code === "combo_cover_missing"
        ) {
          // The server's row is missing, tombstoned, or cover-less. The next pull
          // settles which copy is current, so nothing is written here.
          skipped += 1;
          tick(row.combo_cover_name, "skipped");
          continue;
        }

        failed += 1;
        tick(row.combo_cover_name, "failed");
        log.error(
          new Error(
            `sync: unggah sampul combo ${row.combo_id} gagal (${code || "?"}): ${messageOf(outcome.left)}`,
          ),
        );
      }

      if (statements.length > 0) yield* deps.db.transaction(statements);
      if (changed === 0) break;
    }

    return { uploaded, skipped, failed, bytes };
  }).pipe(
    Effect.catchAllCause((cause) =>
      Effect.sync(() => {
        log.error(new Error(`sync: unggah sampul combo gagal: ${String(cause)}`));
        return { uploaded: 0, skipped: 0, failed: 0, bytes: 0 };
      }),
    ),
  );
}

/** Reads the whole cover manifest (two pages at most) into a `combo_id` lookup. */
function readManifest(
  deps: ComboCoverDeps,
): Effect.Effect<Map<string, { version: number; sha256: string; byteSize: number }>, unknown> {
  return Effect.gen(function* () {
    const byId = new Map<string, { version: number; sha256: string; byteSize: number }>();
    let after: string | null = null;
    for (let page = 0; page < MANIFEST_PAGES; page += 1) {
      const body = yield* Effect.tryPromise({
        try: () =>
          deps.transport.comboCoverManifest(deps.endpoint, { after, limit: MANIFEST_PAGE }),
        catch: (error: unknown) => error,
      });
      for (const blob of body.blobs) {
        byId.set(blob.comboId, {
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

/** Fetches the cover bytes this device is missing, after a page has committed. */
export function fetchComboCoverBlobs(deps: ComboCoverDeps): Effect.Effect<FetchReport> {
  return Effect.gen(function* () {
    let fetched = 0;
    let adopted = 0;
    let missing = 0;
    let bytes = 0;
    let bytesTotal = 0;

    const maxPasses = deps.maxPasses ?? MAX_PASSES;
    for (let pass = 0; pass < maxPasses; pass += 1) {
      const rows = yield* deps.db.selectMany<FetchRow>(FETCH_SQL);
      if (rows.length === 0) break;

      const manifest = yield* readManifest(deps);
      const statements: { sql: string; bindings: (string | number | null)[] }[] = [];

      let planned = 0;
      let passTotal = 0;
      for (const row of rows) {
        if (planned >= BLOB_LIMIT) break;
        const entry = manifest.get(row.combo_id);
        if (entry === undefined) continue;
        if (entry.version !== row.combo_updated_at) continue;
        if (row.combo_cover_blob_sha256 === entry.sha256) continue;
        planned += 1;
        passTotal += entry.byteSize;
      }
      bytesTotal += passTotal;

      let done = 0;
      let changed = 0;
      const tick = (name: string | null, outcome: BlobOutcome): void => {
        done += 1;
        deps.onProgress?.({ done, total: planned, bytes, bytesTotal, name, outcome });
      };

      for (const row of rows) {
        const entry = manifest.get(row.combo_id);
        if (entry === undefined) {
          // No cover bytes on the server for this row: a placeholder, not a
          // failure, and not a download.
          missing += 1;
          continue;
        }
        if (entry.version !== row.combo_updated_at) continue;

        if (row.combo_cover_blob_sha256 === entry.sha256) {
          statements.push(
            markStored(row.combo_id, row.combo_updated_at, entry.sha256, Date.now()),
          );
          adopted += 1;
          changed += 1;
          continue;
        }
        if (done >= BLOB_LIMIT) continue;

        const outcome = yield* Effect.tryPromise({
          try: () =>
            deps.transport.blobGet(deps.endpoint, {
              sha256: entry.sha256,
              fileName: row.combo_cover_name,
            }),
          catch: (error: unknown) => error,
        }).pipe(Effect.either);

        if (outcome._tag === "Left") {
          missing += 1;
          tick(row.combo_cover_name, "skipped");
          log.error(
            new Error(
              `sync: unduh sampul combo ${row.combo_id} gagal (${codeOf(outcome.left) || "?"}): ${messageOf(outcome.left)}`,
            ),
          );
          continue;
        }

        statements.push(markStored(row.combo_id, row.combo_updated_at, entry.sha256, Date.now()));
        fetched += 1;
        changed += 1;
        bytes += outcome.right.byteSize;
        tick(row.combo_cover_name, "ok");
      }

      if (statements.length > 0) yield* deps.db.transaction(statements);
      if (changed === 0) break;
    }

    return { fetched, adopted, missing, bytes };
  }).pipe(
    Effect.catchAllCause((cause) =>
      Effect.sync(() => {
        log.error(new Error(`sync: unduh sampul combo gagal: ${String(cause)}`));
        return { fetched: 0, adopted: 0, missing: 0, bytes: 0 };
      }),
    ),
  );
}
