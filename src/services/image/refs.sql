-- How many live rows name one file under `AppData/images/`.
--
-- A stored picture has no owning row: four tables name a file, and the same name
-- may appear in more than one of them — a picture attached to a cart keeps its
-- name when the sale becomes a record, and the optimizer points several rows of
-- one table at the same bytes. Unlinking is therefore never "the row is gone",
-- it is this count reaching zero.
--
-- Soft-deleted rows do not own their file: `images` keeps a tombstone so the
-- delete can sync, and rows are soft-deleted forever, so a tombstone that owned
-- bytes would mean the catalogue never frees one. `record_images` has no
-- tombstone — it is an immutable child of a record and leaves with it.
--
-- This file is the single definition: `src/services/image/live.ts` imports it
-- raw and `src-tauri/src/image_opt.rs` includes it, so the release gate and the
-- optimizer cannot drift apart. One binding, first placeholders in both callers.
SELECT (
    (SELECT COUNT(*) FROM images
      WHERE image_name = $1 AND image_deleted_at IS NULL) +
    (SELECT COUNT(*) FROM record_images
      WHERE record_image_name = $1) +
    (SELECT COUNT(*) FROM tx_images
      WHERE tx_image_name = $1) +
    (SELECT COUNT(*) FROM combos
      WHERE combo_cover_name = $1 AND combo_deleted_at IS NULL)
  ) AS refs;
