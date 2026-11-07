-- ============================================================================
-- migration-58   The combo aggregate joins the sync protocol.
-- ============================================================================
-- Migration 57 gave `combo_listings` and `combo_extras` hard foreign keys to
-- `listings` and `extras`. That is right for local editing — a combo service
-- validates its references before writing — but wrong for a synced aggregate:
--
--   * A combo is pulled as one frame from the `combo` group, which is a
--     different bookmark from `product` and `extra`. The page that carries the
--     combo may arrive before the page that carries the listing it names, and
--     §7.2 of the sync contract says a dangling cross-group reference must be
--     stored, not rejected.
--   * The same is true in the other direction: a listing or an extra can be
--     tombstoned on another till while a combo here still names it. The combo
--     service already treats a missing reference as "not available" when it
--     expands or edits a template.
--
-- The receipt-child precedent is migration-49: cross-group keys are removed,
-- the ids stay as opaque values, and the intra-aggregate key (`combo_id`, whose
-- header lands in the same transaction) is kept.
--
-- Nothing else changes: the columns, the check constraints and the indexes are
-- the same, and every existing row is copied verbatim.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. combo_listings, rebuilt without the listing foreign key.
-- ----------------------------------------------------------------------------
CREATE TABLE _combo_listings_new (
  combo_listing_id      TEXT PRIMARY KEY,
  combo_id              TEXT NOT NULL REFERENCES combos(combo_id) ON DELETE CASCADE,
  listing_id            TEXT NOT NULL,
  combo_listing_qty     INTEGER NOT NULL CHECK (combo_listing_qty > 0),
  combo_listing_order   INTEGER NOT NULL
) STRICT;

INSERT INTO _combo_listings_new (
  combo_listing_id, combo_id, listing_id, combo_listing_qty, combo_listing_order
)
SELECT combo_listing_id, combo_id, listing_id, combo_listing_qty, combo_listing_order
FROM combo_listings;

DROP TABLE combo_listings;
ALTER TABLE _combo_listings_new RENAME TO combo_listings;

CREATE INDEX combo_listing_combo_idx ON combo_listings (combo_id, combo_listing_order);
CREATE INDEX combo_listing_listing_idx ON combo_listings (listing_id);


-- ----------------------------------------------------------------------------
-- 2. combo_extras, rebuilt without the extra foreign key.
-- ----------------------------------------------------------------------------
CREATE TABLE _combo_extras_new (
  combo_extra_id      TEXT PRIMARY KEY,
  combo_id            TEXT NOT NULL REFERENCES combos(combo_id) ON DELETE CASCADE,
  extra_id            TEXT NOT NULL,
  combo_extra_order   INTEGER NOT NULL
) STRICT;

INSERT INTO _combo_extras_new (combo_extra_id, combo_id, extra_id, combo_extra_order)
SELECT combo_extra_id, combo_id, extra_id, combo_extra_order
FROM combo_extras;

DROP TABLE combo_extras;
ALTER TABLE _combo_extras_new RENAME TO combo_extras;

CREATE INDEX combo_extra_combo_idx ON combo_extras (combo_id, combo_extra_order);
CREATE INDEX combo_extra_extra_idx ON combo_extras (extra_id);
