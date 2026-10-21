-- ============================================================================
-- migration-51   Three dates on a record, and the supplier snapshot.
-- ============================================================================
-- The `records` row used to carry a `record_is_credit` flag and a NOT NULL
-- `record_paid_at`. A credit sale is neither: it is created now, settles later,
-- and keeps the credit date afterwards, so the shape is three columns —
--
--   record_created_at  immutable creation time
--   record_paid_at     settlement time; NULL while a credit is outstanding
--   record_credit_at   credit date; kept after settlement
--
-- A purchase also keeps the supplier id for a live link and a name snapshot, so
-- the record still reads correctly after the supplier is renamed or deleted.
--
-- SQLite cannot drop a column that a CHECK constraint mentions, and the new
-- columns have to be `record_is_credit`-free, so `records` is rebuilt rather
-- than altered. A table rebuild cannot be done by rename alone: SQLite rewrites
-- every foreign key that points at a renamed table, so the children of
-- `records` would follow the *old* table (and would then reject new rows whose
-- parent only exists in the new one). So each child is parked, recreated with
-- its own DDL (its `REFERENCES records` intact) and refilled, and then the
-- parked copies are dropped again. `records_old_51` stays behind for
-- inspection, the way migration-43 parks what it replaces.
--
-- `PRAGMA foreign_keys` is a no-op inside the transaction sqlx applies this in,
-- so the statements below rely on foreign keys staying ON — the order is
-- parent-first, child-first on the way back.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Park what points at `records`, deepest first.
-- ----------------------------------------------------------------------------
ALTER TABLE discounts          RENAME TO discounts_old_51;
ALTER TABLE record_images      RENAME TO record_images_old_51;
ALTER TABLE record_extras      RENAME TO record_extras_old_51;
ALTER TABLE record_methods     RENAME TO record_methods_old_51;
ALTER TABLE record_listings    RENAME TO record_listings_old_51;
ALTER TABLE product_events     RENAME TO product_events_old_51;
ALTER TABLE records            RENAME TO records_old_51;


-- ----------------------------------------------------------------------------
-- 2. `records` in the current shape.
-- ----------------------------------------------------------------------------
CREATE TABLE records (
  record_id             TEXT PRIMARY KEY,
  record_created_at     INTEGER NOT NULL,
  record_paid_at        INTEGER,
  record_rounding       REAL NOT NULL,
  record_credit_at      INTEGER,
  record_cashier        TEXT NOT NULL,
  record_mode           TEXT NOT NULL REFERENCES mode_enum(v),
  record_pay            REAL NOT NULL,
  record_note           TEXT NOT NULL,
  record_fix            INTEGER NOT NULL,
  record_customer_name  TEXT NOT NULL,
  record_customer_phone TEXT NOT NULL,
  record_sub_total      REAL NOT NULL,
  record_total          REAL NOT NULL,
  record_updated_at     INTEGER NOT NULL,
  record_sync_at        INTEGER,
  record_deleted_at     INTEGER,
  record_supplier_id    TEXT REFERENCES suppliers(supplier_id) ON DELETE SET NULL,
  record_supplier_name  TEXT NOT NULL DEFAULT ''
) STRICT;

-- The old flag splits into the two dates: a credit sale was created when it was
-- written and has not been paid; a cash sale was created and paid at once.
INSERT INTO records (
  record_id, record_created_at, record_paid_at, record_rounding, record_credit_at,
  record_cashier, record_mode, record_pay, record_note, record_fix,
  record_customer_name, record_customer_phone, record_sub_total, record_total,
  record_updated_at, record_sync_at, record_deleted_at
)
SELECT
  record_id,
  COALESCE(record_paid_at, record_updated_at, 0),
  CASE WHEN record_is_credit = 1 THEN NULL
       ELSE COALESCE(record_paid_at, record_updated_at, 0) END,
  record_rounding,
  CASE WHEN record_is_credit = 1 THEN COALESCE(record_paid_at, record_updated_at, 0)
       ELSE NULL END,
  record_cashier, record_mode, record_pay, record_note, record_fix,
  record_customer_name, record_customer_phone, record_sub_total, record_total,
  record_updated_at, record_sync_at, record_deleted_at
FROM records_old_51;


-- ----------------------------------------------------------------------------
-- 3. The stock journal, re-pointed at the new `records`.
-- ----------------------------------------------------------------------------
CREATE TABLE product_events (
  product_event_id         TEXT PRIMARY KEY,
  product_event_created_at INTEGER NOT NULL,
  product_event_sync_at    INTEGER,
  product_event_value      INTEGER NOT NULL,
  product_event_capital    REAL NOT NULL,
  product_event_note       TEXT NOT NULL DEFAULT (''),
  product_id               TEXT NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
  stock_id                 TEXT REFERENCES stocks(stock_id) ON DELETE CASCADE,
  record_id                TEXT REFERENCES records(record_id) ON DELETE SET NULL
) STRICT;

INSERT INTO product_events (
  product_event_id, product_event_created_at, product_event_sync_at,
  product_event_value, product_event_capital, product_event_note,
  product_id, stock_id, record_id
)
SELECT
  product_event_id, product_event_created_at, product_event_sync_at,
  product_event_value, product_event_capital, product_event_note,
  product_id, stock_id, record_id
FROM product_events_old_51;


-- ----------------------------------------------------------------------------
-- 4. The record children, re-pointed at the new `records`.
-- ----------------------------------------------------------------------------
CREATE TABLE record_methods (
  record_method_id  TEXT PRIMARY KEY,
  record_id         TEXT NOT NULL REFERENCES records(record_id) ON DELETE CASCADE,
  method_id         TEXT NOT NULL REFERENCES methods(method_id),
  record_method_pay REAL NOT NULL
) STRICT;

INSERT INTO record_methods (record_method_id, record_id, method_id, record_method_pay)
SELECT record_method_id, record_id, method_id, record_method_pay
FROM record_methods_old_51;

CREATE TABLE record_listings (
  record_listing_id       TEXT PRIMARY KEY,
  record_listing_group_id TEXT NOT NULL,
  record_id               TEXT NOT NULL REFERENCES records(record_id) ON DELETE CASCADE,
  product_event_id        TEXT REFERENCES product_events(product_event_id) ON DELETE SET NULL,
  product_id              TEXT REFERENCES products(product_id) ON DELETE SET NULL,
  record_listing_name     TEXT NOT NULL,
  record_listing_kind     TEXT NOT NULL DEFAULT 'retail',
  record_listing_unit     INTEGER NOT NULL DEFAULT 1,
  record_listing_price    REAL NOT NULL,
  record_listing_qty      REAL NOT NULL,
  record_listing_capital  REAL NOT NULL,
  record_listing_total    REAL NOT NULL
) STRICT;

INSERT INTO record_listings (
  record_listing_id, record_listing_group_id, record_id, product_event_id,
  product_id, record_listing_name, record_listing_kind, record_listing_unit,
  record_listing_price, record_listing_qty, record_listing_capital,
  record_listing_total
)
SELECT
  record_listing_id, record_listing_group_id, record_id, product_event_id,
  product_id, record_listing_name, record_listing_kind, record_listing_unit,
  record_listing_price, record_listing_qty, record_listing_capital,
  record_listing_total
FROM record_listings_old_51;

CREATE TABLE discounts (
  discount_id       TEXT PRIMARY KEY,
  discount_group_id TEXT NOT NULL,
  record_listing_id TEXT NOT NULL REFERENCES record_listings(record_listing_id) ON DELETE CASCADE,
  discount_kind     TEXT NOT NULL CHECK (discount_kind IN ('number', 'percent', 'pcs')),
  discount_value    REAL NOT NULL,
  discount_eff      REAL NOT NULL
) STRICT;

INSERT INTO discounts (discount_id, discount_group_id, record_listing_id, discount_kind, discount_value, discount_eff)
SELECT discount_id, discount_group_id, record_listing_id, discount_kind, discount_value, discount_eff
FROM discounts_old_51;

CREATE TABLE record_extras (
  record_extra_id    TEXT PRIMARY KEY,
  record_extra_name  TEXT NOT NULL,
  record_id          TEXT NOT NULL REFERENCES records(record_id) ON DELETE CASCADE,
  record_extra_value REAL NOT NULL,
  record_extra_eff   REAL NOT NULL,
  record_extra_kind  TEXT NOT NULL CHECK (record_extra_kind IN ('number', 'percent'))
) STRICT;

INSERT INTO record_extras (
  record_extra_id, record_extra_name, record_id,
  record_extra_value, record_extra_eff, record_extra_kind
)
SELECT
  record_extra_id, record_extra_name, record_id,
  record_extra_value, record_extra_eff, record_extra_kind
FROM record_extras_old_51;

CREATE TABLE record_images (
  record_image_id    TEXT PRIMARY KEY,
  record_image_order INTEGER NOT NULL,
  record_image_name  TEXT NOT NULL,
  record_image_mime  TEXT NOT NULL REFERENCES img_mimes(v),
  record_id          TEXT NOT NULL REFERENCES records(record_id) ON DELETE CASCADE
) STRICT;

INSERT INTO record_images (
  record_image_id, record_image_order, record_image_name, record_image_mime, record_id
)
SELECT record_image_id, record_image_order, record_image_name, record_image_mime, record_id
FROM record_images_old_51;


-- ----------------------------------------------------------------------------
-- 5. Drop the copies. Every row is in the table above; only `records_old_51`
--    is worth keeping, because its `record_is_credit` flag has no replacement.
--    Children go first so no cascade reaches a table that still matters.
-- ----------------------------------------------------------------------------
DROP TABLE discounts_old_51;
DROP TABLE record_images_old_51;
DROP TABLE record_extras_old_51;
DROP TABLE record_methods_old_51;
DROP TABLE record_listings_old_51;
DROP TABLE product_events_old_51;


-- ----------------------------------------------------------------------------
-- 5b. Indexes. They are created only now: parking a table keeps its index
--     names, so the new tables cannot claim them until the copies are gone.
-- ----------------------------------------------------------------------------
CREATE INDEX product_event_product_idx ON product_events (product_id);
CREATE INDEX product_event_stock_idx   ON product_events (stock_id);
CREATE INDEX product_event_record_idx  ON product_events (record_id);

CREATE INDEX record_method_record_idx ON record_methods (record_id);

CREATE INDEX record_listing_record_idx  ON record_listings (record_id);
CREATE INDEX record_listing_group_idx   ON record_listings (record_listing_group_id);
CREATE INDEX record_listing_event_idx   ON record_listings (product_event_id);
CREATE INDEX record_listing_product_idx ON record_listings (product_id);

CREATE INDEX discount_listing_idx ON discounts (record_listing_id);
CREATE INDEX discount_group_idx   ON discounts (discount_group_id);

CREATE INDEX record_image_record_idx ON record_images (record_id);


-- ----------------------------------------------------------------------------
-- 6. The cart keeps the pending supplier text, like the customer text in 50.
-- ----------------------------------------------------------------------------
ALTER TABLE tx_records ADD COLUMN tx_record_supplier_name TEXT NOT NULL DEFAULT '';
