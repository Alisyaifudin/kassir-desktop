-- ============================================================================
-- migration-62   Name-key indexes for the image refcount.
-- ============================================================================
-- An image's bytes are a file under `AppData/images/`, addressed by name, and
-- nothing else identifies it: `images.image_name`, `record_images.
-- record_image_name`, `tx_images.tx_image_name` and `combos.combo_cover_name`
-- are all keys into that one folder.
--
-- The optimizer (Setting → Gambar) is about to make that many-to-one — several
-- rows may name one file once identical pictures are deduped — so *freeing* a
-- file can no longer mean "the row that owned it is gone". It means "no row
-- names it any more", which is a count across all four tables
-- (`src/services/image/live.ts`), run on every image that is removed from a
-- product, a draft cart or a combo.
--
-- None of those four lookups is indexed today, and two of them sit on the
-- fastest-growing tables in the app: `record_images` gains a row per photographed
-- sale, `tx_images` per picture taken at the till. Without these, releasing one
-- image is three full scans plus a scan of `images`.
--
-- Nothing is backfilled and no row changes: an index is derived from the rows
-- already there.
--
-- `combo_cover_name` is nullable by design (most combos have no cover), so its
-- index is partial — it skips the NULL rows a `= $1` probe never matches.
CREATE INDEX image_name_idx ON images (image_name);

CREATE INDEX record_image_name_idx ON record_images (record_image_name);

CREATE INDEX tx_image_name_idx ON tx_images (tx_image_name);

CREATE INDEX combo_cover_name_idx ON combos (combo_cover_name)
  WHERE combo_cover_name IS NOT NULL;
