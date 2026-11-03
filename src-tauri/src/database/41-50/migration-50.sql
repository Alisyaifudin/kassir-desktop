-- ============================================================================
-- migration-50   The image-byte side channel: three client-only columns.
-- ============================================================================
-- `SYNC-V2.md` §2.10/§8.7.1 splits an image in two. Its **row** (the seven
-- columns of `images`) travels through `product_group_change_log` like any other
-- catalog row. Its **bytes** travel over a separate, content-addressed side
-- channel that spends no `seq` and moves no bookmark. These three columns are the
-- whole of the client's bookkeeping for that channel, and none of them is ever on
-- the wire — `schema.ts` lists the seven wire columns and the merge writes only
-- those, so a pulled row leaves this trio alone (§8.7.1 "leave them untouched by
-- a pull merge").
--
--   image_blob_version  the `image_updated_at` the file on disk belongs to.
--                       NULL = this device has no file it can vouch for.
--   image_blob_sha256   sha256 of that file, as the server reported it.
--   image_blob_sync_at  NULL = the bytes were never accepted by the server.
--
-- The three predicates they drive (and nothing else does):
--
--   usable local file   blob_version = image_updated_at AND blob_sha256 IS NOT NULL
--   needs upload        blob_sync_at IS NULL AND blob_version = image_updated_at
--   needs fetch         blob_version <> image_updated_at, or no sha at all
--
-- Why the version is a column of its own rather than a derived comparison: an
-- image row's clock is bumped by every metadata edit (a reorder, a re-parent), so
-- `image_updated_at` moves without the bytes changing. The version says which
-- *bytes* the file holds, which is a different fact and has to be recorded at the
-- moment the app writes the file. `src/services/product/live.ts` maintains it on
-- every path that touches an image row; `src/services/sync/blob.ts` consumes it.
--
-- The backfill below is deliberate and safe in this product's model: the bytes of
-- one `image_id` never change (the UI adds, reorders and deletes pictures, it
-- never re-crops one), and a file under `images/` was written by whichever device
-- created that row. So an existing local file is the current version's bytes.
-- A row whose file is missing — a picture this device pulled but never had — is
-- cleared again on its first upload attempt (`local_missing`), which turns it into
-- a fetch. Deleted rows are left NULL: nothing may upload or download them.
-- ============================================================================

PRAGMA foreign_keys = OFF;      -- no-op under sqlx; kept so the file also runs in the CLI
PRAGMA busy_timeout = 30000;


-- ----------------------------------------------------------------------------
-- 1. The three client-only columns.
-- ----------------------------------------------------------------------------
ALTER TABLE images ADD COLUMN image_blob_version INTEGER;
ALTER TABLE images ADD COLUMN image_blob_sha256 TEXT;
ALTER TABLE images ADD COLUMN image_blob_sync_at INTEGER;


-- ----------------------------------------------------------------------------
-- 2. Every live image's existing file is the current version's bytes.
-- ----------------------------------------------------------------------------
UPDATE images SET image_blob_version = image_updated_at WHERE image_deleted_at IS NULL;


PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 30;
