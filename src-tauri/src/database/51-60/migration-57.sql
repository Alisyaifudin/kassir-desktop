-- ============================================================================
-- migration-57   Combo templates for POS: ordered listing components, preset
--                transaction extras, and an optional cover reference.
-- ============================================================================
-- Combos are catalogue definitions. They are not transaction lines: selecting
-- one expands its current listings and extras into the ordinary tx_* cart rows.
-- The *_sync_at marker is reserved for a future combo sync group; no sync group
-- is registered for this migration. Children are transferred as part of their
-- parent combo aggregate, not as standalone sync entities.

CREATE TABLE combos (
  combo_id           TEXT PRIMARY KEY,
  combo_name         TEXT NOT NULL,
  combo_active       INTEGER NOT NULL DEFAULT 1 CHECK (combo_active IN (0, 1)),
  combo_cover_name   TEXT,
  combo_cover_mime   TEXT REFERENCES img_mimes(v),
  combo_updated_at   INTEGER NOT NULL,
  combo_sync_at      INTEGER,
  combo_deleted_at   INTEGER,
  CHECK ((combo_cover_name IS NULL) = (combo_cover_mime IS NULL))
) STRICT;

CREATE INDEX combo_updated_idx ON combos (combo_updated_at, combo_id);

CREATE TABLE combo_listings (
  combo_listing_id      TEXT PRIMARY KEY,
  combo_id              TEXT NOT NULL REFERENCES combos(combo_id) ON DELETE CASCADE,
  listing_id            TEXT NOT NULL REFERENCES listings(listing_id) ON DELETE RESTRICT,
  combo_listing_qty     INTEGER NOT NULL CHECK (combo_listing_qty > 0),
  combo_listing_order   INTEGER NOT NULL
) STRICT;

CREATE INDEX combo_listing_combo_idx ON combo_listings (combo_id, combo_listing_order);
CREATE INDEX combo_listing_listing_idx ON combo_listings (listing_id);

CREATE TABLE combo_extras (
  combo_extra_id      TEXT PRIMARY KEY,
  combo_id            TEXT NOT NULL REFERENCES combos(combo_id) ON DELETE CASCADE,
  extra_id            TEXT NOT NULL REFERENCES extras(extra_id) ON DELETE RESTRICT,
  combo_extra_order   INTEGER NOT NULL
) STRICT;

CREATE INDEX combo_extra_combo_idx ON combo_extras (combo_id, combo_extra_order);
CREATE INDEX combo_extra_extra_idx ON combo_extras (extra_id);
