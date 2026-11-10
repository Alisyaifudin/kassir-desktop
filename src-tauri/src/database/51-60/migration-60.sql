-- ============================================================================
-- migration-60   The combo cover's byte side channel: three client-only columns.
-- ============================================================================
-- A combo ROW carries `combo_cover_name` and `combo_cover_mime` and travels
-- through `combo_group_change_log` like every other aggregate header. Its BYTES
-- now travel over the same content-addressed side channel the product gallery
-- uses (`SYNC-V2.md` §8.7.1, server migration `0023_combo_cover_blobs.sql`): an
-- upload spends no `seq` and moves no bookmark. These three columns are the
-- whole of the client's bookkeeping for that channel, and none of them is ever
-- on the wire — `src/services/sync/schema.ts` lists the seven wire columns and
-- the merge writes only those, so a pulled combo leaves this trio alone.
--
--   combo_cover_blob_version  the `combo_updated_at` the file on disk belongs
--                             to. NULL = this device has no cover file it can
--                             vouch for.
--   combo_cover_blob_sha256   sha256 of that file, as the server reported it.
--   combo_cover_blob_sync_at  NULL = the cover bytes were never accepted.
--
-- The three predicates they drive (and nothing else does):
--
--   usable local file   blob_version = combo_updated_at AND blob_sha256 IS NOT NULL
--   needs upload        blob_sync_at IS NULL AND blob_version = combo_updated_at
--   needs fetch         blob_version <> combo_updated_at, or no sha at all
--
-- Why the version is a column of its own: a combo save replaces the aggregate and
-- bumps `combo_updated_at` even when the cover file did not change, so the clock
-- moves without the bytes changing. `src/services/combo/live.ts` carries the
-- version forward on such a save (and sets it on a new cover); `sync/combo-cover.ts`
-- consumes it. A combo with no cover is left NULL: nothing may upload or
-- download it.
--
-- The backfill is safe in this product's model for the same reason migration-50's
-- is: the bytes of one cover file never change (the form mints a new name for
-- every new picture), and a file under `images/` was written by whichever device
-- created the combo. A row whose file is missing is cleared again on its first
-- upload attempt (`local_missing`), which turns it into a fetch.
-- ============================================================================

PRAGMA foreign_keys = OFF;      -- no-op under sqlx; kept so the file also runs in the CLI
PRAGMA busy_timeout = 30000;


-- ----------------------------------------------------------------------------
-- 1. The three client-only columns.
-- ----------------------------------------------------------------------------
ALTER TABLE combos ADD COLUMN combo_cover_blob_version INTEGER;
ALTER TABLE combos ADD COLUMN combo_cover_blob_sha256 TEXT;
ALTER TABLE combos ADD COLUMN combo_cover_blob_sync_at INTEGER;


-- ----------------------------------------------------------------------------
-- 2. Every live combo's existing cover file is the current version's bytes.
-- ----------------------------------------------------------------------------
UPDATE combos
   SET combo_cover_blob_version = combo_updated_at
 WHERE combo_deleted_at IS NULL AND combo_cover_name IS NOT NULL;


PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 30;
