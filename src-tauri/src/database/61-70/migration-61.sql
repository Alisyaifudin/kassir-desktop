-- ============================================================================
-- migration-61   Repair the records a mode flip left unsendable.
-- ============================================================================
-- `record.set.mode` used to move a record's children (listings, methods, extras,
-- images, discounts) onto the replacement record while keeping their primary
-- keys, and to rewrite the record's `product_events` in place. Both halves break
-- the sync contract:
--
--   * A child primary key belongs to exactly one record. The server already
--     stores `rl_x` under the old record id, so every push carrying it under the
--     new id is refused as `bad_frame` — and because a push is one transaction,
--     nothing else in the record group moves either. The flip is stuck forever:
--     retrying sends the same illegal frame, and `Sinkronisasi Ulang` re-marks it
--     dirty rather than repairing it.
--   * `product_events` is append-only on the wire, so an event edited in place
--     (sign flipped, owner moved) is a `noop` there: the stock reversal never
--     reached another till.
--
-- This migration finds that exact shape and puts the device back into a state the
-- server will accept. It is deliberately conservative — every predicate below is
-- part of the signature, so an ordinary delete or a `dual` pair cannot match:
--
--   gone  a soft-deleted record, still dirty, with NO children left
--   kept  a live record, still dirty, sharing its `record_created_at`,
--         `record_updated_at`, `record_total` and `record_pay`, in the other
--         mode, with children, and unpaired (a flip never sets `record_pair_id`)
--
-- The flip wrote one `now` onto both rows, which is what makes the twin
-- recognizable: nothing else stamps a tombstone and a new record with the same
-- clock and the same creation date. `record_updated_at` is then bumped on the
-- replacement so a second run cannot match the same pair again.
--
-- What it does, in order:
--
--   1. gives the replacement's children keys of their own (discounts follow the
--      listing they hang off);
--   2. reverts the in-place event edit for the events that had already reached
--      the server, and appends the compensation those events need to net out to
--      the flipped direction on every other device;
--   3. marks both rows dirty and bumps the replacement's clock, so the next cycle
--      pushes a legal aggregate.
--
-- It does not touch `stocks`: the local journal and the cached lots are already
-- in the flipped state, and step 2 leaves them there (the compensation is what
-- makes the fold agree once the replacement's own events travel with it).
--
-- The listing rows keep the replacement's `product_event_id`, which now names the
-- tombstone's event again; that reference is a pointer for the product page, not
-- ownership — the replacement's own movement arrives with the next flip or with
-- the compensation events above.
-- ============================================================================

PRAGMA foreign_keys = OFF;      -- no-op under sqlx; kept so the file also runs in the CLI
PRAGMA busy_timeout = 30000;


-- ----------------------------------------------------------------------------
-- 1. The flip twins: a tombstone with no children, and its unpaired live copy.
-- ----------------------------------------------------------------------------
CREATE TEMP TABLE _mode_flip (
  old_id TEXT NOT NULL UNIQUE,
  new_id TEXT NOT NULL UNIQUE
);

INSERT INTO _mode_flip (old_id, new_id)
SELECT gone.record_id, kept.record_id
  FROM records gone
  JOIN records kept
    ON kept.record_created_at = gone.record_created_at
   AND kept.record_updated_at = gone.record_updated_at
   AND kept.record_total = gone.record_total
   AND kept.record_pay = gone.record_pay
   AND kept.record_mode <> gone.record_mode
   AND kept.record_id <> gone.record_id
 WHERE gone.record_deleted_at IS NOT NULL
   AND gone.record_sync_at IS NULL
   AND gone.record_pair_id IS NULL
   AND kept.record_deleted_at IS NULL
   AND kept.record_sync_at IS NULL
   AND kept.record_pair_id IS NULL
   AND NOT EXISTS (SELECT 1 FROM record_listings x WHERE x.record_id = gone.record_id)
   AND NOT EXISTS (SELECT 1 FROM record_methods  x WHERE x.record_id = gone.record_id)
   AND NOT EXISTS (SELECT 1 FROM record_extras   x WHERE x.record_id = gone.record_id)
   AND NOT EXISTS (SELECT 1 FROM record_images   x WHERE x.record_id = gone.record_id)
   AND     EXISTS (SELECT 1 FROM record_listings x WHERE x.record_id = kept.record_id);


-- ----------------------------------------------------------------------------
-- 2. New keys for the children the replacement is holding.
-- ----------------------------------------------------------------------------
-- 26 chars, the length `generateId` mints, so nothing downstream has to care
-- that this column was written by a migration.
CREATE TEMP TABLE _mode_flip_listing (old_id TEXT NOT NULL UNIQUE, new_id TEXT NOT NULL UNIQUE);
INSERT INTO _mode_flip_listing (old_id, new_id)
SELECT rl.record_listing_id, upper(hex(randomblob(13)))
  FROM record_listings rl
  JOIN _mode_flip f ON f.new_id = rl.record_id;

-- The discount is the listing's child, so it moves first: the listing's key is
-- what it points at.
UPDATE discounts
   SET record_listing_id = (
         SELECT m.new_id FROM _mode_flip_listing m WHERE m.old_id = discounts.record_listing_id
       )
 WHERE record_listing_id IN (SELECT old_id FROM _mode_flip_listing);

UPDATE record_listings
   SET record_listing_id = (
         SELECT m.new_id FROM _mode_flip_listing m WHERE m.old_id = record_listings.record_listing_id
       )
 WHERE record_listing_id IN (SELECT old_id FROM _mode_flip_listing);

UPDATE record_methods
   SET record_method_id = upper(hex(randomblob(13)))
 WHERE record_id IN (SELECT new_id FROM _mode_flip);

UPDATE record_extras
   SET record_extra_id = upper(hex(randomblob(13)))
 WHERE record_id IN (SELECT new_id FROM _mode_flip);

UPDATE record_images
   SET record_image_id = upper(hex(randomblob(13)))
 WHERE record_id IN (SELECT new_id FROM _mode_flip);


-- ----------------------------------------------------------------------------
-- 3. The journal: revert what never reached the server, append what must.
-- ----------------------------------------------------------------------------
-- Only events that were already pushed need this: the server holds them as the
-- tombstone's, at the pre-flip sign, and ignores any later edit of that id. An
-- event that never left the device is simply pushed with the value it has now,
-- and stays the replacement's own movement.
--
-- The compensation is written before the revert because it reads the flipped
-- value: every other till holds `v`, and the local flip made it `-v`, so the two
-- agree once they add `2 * -v`.
INSERT INTO product_events (
  product_event_id, product_event_created_at, product_event_sync_at,
  product_event_value, product_event_capital, product_id, stock_id, record_id,
  product_event_note
)
SELECT
  upper(hex(randomblob(13))),
  CAST(strftime('%s', 'now') AS INTEGER) * 1000,
  NULL,
  2 * e.product_event_value,
  e.product_event_capital,
  e.product_id,
  e.stock_id,
  NULL,
  'Ubah mode'
FROM product_events e
JOIN _mode_flip f ON f.new_id = e.record_id
WHERE e.product_event_sync_at IS NOT NULL;

UPDATE product_events
   SET record_id = (
         SELECT f.old_id FROM _mode_flip f WHERE f.new_id = product_events.record_id
       ),
       product_event_value = -product_event_value
 WHERE record_id IN (SELECT new_id FROM _mode_flip)
   AND product_event_sync_at IS NOT NULL;


-- ----------------------------------------------------------------------------
-- 4. Both rows go back on the queue; the replacement gets a newer clock so this
--    pair can never match again.
-- ----------------------------------------------------------------------------
UPDATE records
   SET record_sync_at = NULL,
       record_updated_at = max(CAST(strftime('%s', 'now') AS INTEGER) * 1000, record_updated_at + 1)
 WHERE record_id IN (SELECT new_id FROM _mode_flip);

UPDATE records
   SET record_sync_at = NULL
 WHERE record_id IN (SELECT old_id FROM _mode_flip);

DROP TABLE _mode_flip_listing;
DROP TABLE _mode_flip;

PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 30;
