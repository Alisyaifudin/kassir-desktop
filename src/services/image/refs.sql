-- How many live rows name one file under `AppData/images/`.
--
-- A stored picture has no owning row: four tables name a file, and the same name
-- may appear in more than one of them — a picture attached to a cart keeps its
-- name when the sale becomes a record, and the optimizer points several rows of
-- one table at the same bytes. Unlinking is therefore never "the row is gone",
-- it is this count reaching zero.
--
-- Soft-deleted rows do not own their file: every table here keeps a tombstone so
-- the delete can sync, and tombstoned rows stay forever, so a tombstone that owned
-- bytes would mean the catalogue never frees one.
--
-- `record_images` is the one table whose tombstone lives on its *parent*: it is an
-- immutable child of a record and has no `_deleted_at` of its own, so a voided
-- sale keeps its rows and stops owning its pictures. That is the intent — a sale
-- that was undone should not pin the bytes of a picture the product gallery has
-- since stopped showing — but it is the one case where the file is the last copy:
-- the byte channel covers `images` only (`sync_blob.rs`), so a receipt's picture
-- cannot be downloaded again. Voiding a sale therefore deletes its photos on this
-- device, which is why the delete path releases them deliberately rather than by
-- omission.
--
-- This file is the single definition: `src/services/image/live.ts` imports it
-- raw and `src-tauri/src/image_opt.rs` includes it, so the release gate and the
-- optimizer cannot drift apart. One binding, first placeholders in both callers.
-- `src/services/image/refs-schema.test.ts` pins it to the schema: a table that
-- starts naming files and is not counted here is a file the delete paths believe
-- nobody owns.
SELECT (
    (SELECT COUNT(*) FROM images
      WHERE image_name = $1 AND image_deleted_at IS NULL) +
    (SELECT COUNT(*) FROM record_images
      JOIN records ON records.record_id = record_images.record_id
      WHERE record_image_name = $1 AND records.record_deleted_at IS NULL) +
    (SELECT COUNT(*) FROM tx_images
      WHERE tx_image_name = $1) +
    (SELECT COUNT(*) FROM combos
      WHERE combo_cover_name = $1 AND combo_deleted_at IS NULL)
  ) AS refs;
