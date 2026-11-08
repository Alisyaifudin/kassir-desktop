-- ============================================================================
-- migration-59   Combo discounts: a per-component discount stack, so a combo
--                template can carry the same per-line discount rows a sale has.
-- ============================================================================
-- A combo component is a listing reference with a quantity. Until now the
-- template could not say anything about the money on that line, so a "Paket
-- hemat" could only discount through transaction-wide Extras. This table adds a
-- small ordered stack per component, mirroring `discounts` on a record line:
--
--   combo_discount_id     stable id (new on every template save, like the
--                         component rows the save replaces)
--   combo_listing_id      the component it belongs to; the component is the
--                         local parent, so the rows cascade when it is replaced
--   combo_discount_value  the amount, a percentage, or a piece count
--   combo_discount_kind   number | percent | pcs
--   combo_discount_order  the stack order; a percentage applies to the running
--                         total, so order is meaningful
--
-- The derived rupiah (`eff`) is deliberately not stored: it belongs to the
-- price and quantity at expansion time, and the catalogue price can move after
-- the template was saved. `recalcDiscounts` derives it when the combo is
-- expanded and when the editor draws the line.
--
-- The table is part of the combo aggregate in the sync protocol. It is reached
-- through `combo_listing_id`, not through `combo_id`, so a frame never repeats
-- the aggregate key on a discount row.
-- ============================================================================

PRAGMA foreign_keys = OFF;      -- no-op under sqlx; kept so the file also runs in the CLI
PRAGMA busy_timeout = 30000;


CREATE TABLE combo_discounts (
  combo_discount_id     TEXT PRIMARY KEY,
  combo_listing_id      TEXT NOT NULL REFERENCES combo_listings(combo_listing_id) ON DELETE CASCADE,
  combo_discount_value  REAL NOT NULL CHECK (combo_discount_value >= 0),
  combo_discount_kind   TEXT NOT NULL CHECK (combo_discount_kind IN ('number', 'percent', 'pcs')),
  combo_discount_order  INTEGER NOT NULL,
  CHECK (combo_discount_kind <> 'percent' OR combo_discount_value <= 100)
) STRICT;

CREATE INDEX combo_discount_listing_idx
  ON combo_discounts (combo_listing_id, combo_discount_order);


PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 30;
