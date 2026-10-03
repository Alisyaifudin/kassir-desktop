-- ============================================================================
-- migration-43   (BRAINSTORM DRAFT v2 — not registered in mod.rs yet)
-- ============================================================================
-- Goals
--   1. Replace the `graves` tombstone table with `*_deleted_at` soft-delete
--      columns on top-level sync entities.
--   2. Decompose `products` into  stocks / listings / codes.
--   3. Split record payment methods into a dedicated `record_methods` table.
--   4. Replace `record_products` with `record_listings` (no product FK).
--   5. Repoint `product_events` at `stocks` instead of `products`.
--
-- Conventions (locked in this revision)
--   * Column naming: `<singular_table>_<field>`; FK columns are named after the
--     referenced table (`product_id`, `record_id`, `listing_id`, ...).
--   * Soft-delete name: `<singular_table>_deleted_at`.
--   * Sync metadata: `<singular_table>_updated_at` / `<singular_table>_sync_at`.
--   * Child tables carry NO tombstones. They are synced as part of the parent
--     aggregate (delete + reinsert on the client). See "SYNC CONTRACT" below.
--   * `cashiers` is NOT sync-able.
--
-- Ground rules for this draft
--   * NO `DROP TABLE`. Every replaced table is parked as `<name>_old`.
--   * The live data IS backfilled 1:1 from the `*_old` tables (section 10).
--   * sqlx runs this file inside a transaction and ignores `PRAGMA
--     foreign_keys` inside a transaction, so foreign_keys stays ON (sqlx
--     default). `ALTER TABLE ... RENAME` therefore rewrites FK references,
--     which is why every dependent table is rebuilt against the new parent.
-- ============================================================================

PRAGMA foreign_keys = OFF;      -- no-op under sqlx; kept so the file also runs in the CLI
PRAGMA busy_timeout = 30000;


-- ----------------------------------------------------------------------------
-- 1. Park the tables we rebuild (and retire the grave tombstone pair).
-- ----------------------------------------------------------------------------
ALTER TABLE record_extras    RENAME TO record_extras_old;
ALTER TABLE discounts        RENAME TO discounts_old;
ALTER TABLE record_products  RENAME TO record_products_old;
ALTER TABLE product_events   RENAME TO product_events_old;
ALTER TABLE records          RENAME TO records_old;
ALTER TABLE images           RENAME TO images_old;
ALTER TABLE products         RENAME TO products_old;
ALTER TABLE mode_enum        RENAME TO mode_enum_old;
ALTER TABLE graves           RENAME TO graves_old;
ALTER TABLE graves_kind      RENAME TO graves_kind_old;


-- ----------------------------------------------------------------------------
-- 2. `<singular>_deleted_at` on top-level sync entities that are NOT rebuilt.
--    (`methods.method_deleted_at` already conforms — left untouched.)
-- ----------------------------------------------------------------------------
ALTER TABLE extras      ADD COLUMN extra_deleted_at       INTEGER;
ALTER TABLE customers   ADD COLUMN customer_deleted_at    INTEGER;
ALTER TABLE socials     ADD COLUMN social_deleted_at      INTEGER;
ALTER TABLE money       ADD COLUMN money_deleted_at       INTEGER;
ALTER TABLE money_kind  ADD COLUMN money_kind_deleted_at  INTEGER;


-- ----------------------------------------------------------------------------
-- 3. Enums.
-- ----------------------------------------------------------------------------
CREATE TABLE code_kind_enum (
  v TEXT PRIMARY KEY
) STRICT;

INSERT INTO code_kind_enum (v) VALUES ('barcode'), ('qr');

-- Replaces the old ('sell', 'buy') enum. `records_old` still references
-- `mode_enum_old` (sell/buy); the new `records` uses these terms, which the
-- section 10.6 backfill maps: sell -> outcoming, buy -> incoming.
CREATE TABLE mode_enum (
  v TEXT PRIMARY KEY
) STRICT;

INSERT INTO mode_enum (v) VALUES ('incoming'), ('outcoming');


-- ----------------------------------------------------------------------------
-- 4. `products` — slimmed down.
--    Removed: product_barcode (-> codes), product_price (-> listings),
--             product_stock (-> stocks), product_capital (-> stocks).
-- ----------------------------------------------------------------------------
CREATE TABLE products (
  product_id         TEXT PRIMARY KEY,
  product_name       TEXT NOT NULL,
  product_note       TEXT NOT NULL DEFAULT (''),
  product_updated_at INTEGER NOT NULL,
  product_sync_at    INTEGER,
  product_deleted_at INTEGER
) STRICT;

-- Backfilled in section 10.


-- ----------------------------------------------------------------------------
-- 5. Product aggregate children (no tombstones by design).
-- ----------------------------------------------------------------------------

-- stocks: one row per cost lot; a product can carry several capital values.
-- `stock_value` is an integer count of base pcs; `stock_capital` is cost/pc.
-- `stock_created_at` orders lots for FIFO consumption.
CREATE TABLE stocks (
  stock_id         TEXT PRIMARY KEY,
  product_id       TEXT NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
  stock_value      INTEGER NOT NULL,
  stock_capital    REAL NOT NULL,
  stock_created_at INTEGER NOT NULL,
  stock_updated_at INTEGER NOT NULL
) STRICT;

CREATE INDEX stock_product_idx ON stocks (product_id);

-- listings: the sellable entity shown in the POS.
--   listing_unit  conversion factor to base pcs (1 pcs = 1, 1 dozen = 12,
--                 bundle 2+1 = 3).
--   listing_price the selling price for this listing/unit.
--   listing_kind  user-defined label to tell listings apart (e.g. "retail",
--                 "wholesale", "marketplace"). Intentionally NOT an enum and
--                 NOT validated by the DB. Normalize casing in app code.
-- TODO(q1): default `retail` is a guess — keep or make it required input?
CREATE TABLE listings (
  listing_id         TEXT PRIMARY KEY,
  product_id         TEXT NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
  listing_name       TEXT NOT NULL,
  listing_price      REAL NOT NULL,
  listing_unit       INTEGER NOT NULL DEFAULT 1,
  listing_kind       TEXT NOT NULL DEFAULT 'retail',
  listing_updated_at INTEGER NOT NULL
) STRICT;

CREATE INDEX listing_product_idx ON listings (product_id);

-- codes: a product can carry several codes (barcode / qr). A code may also be
-- scoped to a specific listing. Only `barcode` is globally unique.
CREATE TABLE codes (
  code_id         TEXT PRIMARY KEY,
  product_id      TEXT NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
  listing_id      TEXT REFERENCES listings(listing_id) ON DELETE CASCADE,
  code_value      TEXT NOT NULL,
  code_kind       TEXT NOT NULL REFERENCES code_kind_enum(v),
  code_updated_at INTEGER NOT NULL
) STRICT;

CREATE UNIQUE INDEX code_barcode_unique ON codes (code_value) WHERE code_kind = 'barcode';
CREATE INDEX code_value_idx   ON codes (code_value);
CREATE INDEX code_product_idx ON codes (product_id);
CREATE INDEX code_listing_idx ON codes (listing_id);


-- ----------------------------------------------------------------------------
-- 6. `images` — rebuilt to add `image_deleted_at` and to point at the new
--    `products` after the rename.
-- ----------------------------------------------------------------------------
CREATE TABLE images (
  image_id         TEXT PRIMARY KEY,
  image_order      INTEGER NOT NULL,
  image_name       TEXT NOT NULL,
  image_mime       TEXT NOT NULL REFERENCES img_mimes(v),
  product_id       TEXT NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
  image_updated_at INTEGER NOT NULL,
  image_sync_at    INTEGER,
  image_deleted_at INTEGER
) STRICT;


-- ----------------------------------------------------------------------------
-- 7. `product_events` — now references a stock lot. This is the rollback log:
--    deleting a record replays events to recompute each stock lot's value.
--    Columns renamed to the `<singular>_*` convention.
-- ----------------------------------------------------------------------------
CREATE TABLE product_events (
  product_event_id         TEXT PRIMARY KEY,
  product_event_created_at INTEGER NOT NULL,
  product_event_sync_at    INTEGER,
  product_event_type       TEXT NOT NULL REFERENCES product_event_enum(v),
  product_event_value      INTEGER NOT NULL,
  stock_id                 TEXT NOT NULL REFERENCES stocks(stock_id) ON DELETE CASCADE
) STRICT;

CREATE INDEX product_event_stock_idx ON product_events (stock_id);


-- ----------------------------------------------------------------------------
-- 8. `records` — drop `method_id` (moved to `record_methods`).
--    `record_pay` stays as a denormalized cache of SUM(record_methods...pay).
-- ----------------------------------------------------------------------------
CREATE TABLE records (
  record_id             TEXT PRIMARY KEY,
  record_paid_at        INTEGER NOT NULL,
  record_rounding       REAL NOT NULL,
  record_is_credit      INTEGER NOT NULL CHECK (record_is_credit IN (0, 1)),
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
  record_deleted_at     INTEGER
) STRICT;

-- record_methods: one row per payment applied (split payment). `record_pay`
-- on `records` is a cache of SUM(record_method_pay) and is intentionally not
-- normalized away.
CREATE TABLE record_methods (
  record_method_id  TEXT PRIMARY KEY,
  record_id         TEXT NOT NULL REFERENCES records(record_id) ON DELETE CASCADE,
  method_id         TEXT NOT NULL REFERENCES methods(method_id),
  record_method_pay REAL NOT NULL
) STRICT;

CREATE INDEX record_method_record_idx ON record_methods (record_id);

-- record_listings: replaces `record_products`. References the listing, not the
-- product. `record_listing_capital` is the single capital snapshot (the old
-- `product_capital_raw` / `product_capital` split is gone).
-- TODO(q2): `record_listing_kind` is snapshotted because `listing_id` becomes
--   NULL if the listing is later deleted, which would lose retail/wholesale
--   history. Confirm you want the snapshot.
CREATE TABLE record_listings (
  record_listing_id      TEXT PRIMARY KEY,
  listing_id             TEXT REFERENCES listings(listing_id) ON DELETE SET NULL,
  record_id              TEXT NOT NULL REFERENCES records(record_id) ON DELETE CASCADE,
  record_listing_name    TEXT NOT NULL,
  record_listing_kind    TEXT NOT NULL DEFAULT 'retail',
  record_listing_price   REAL NOT NULL,
  record_listing_qty     INTEGER NOT NULL,
  record_listing_capital REAL NOT NULL,
  record_listing_total   REAL NOT NULL
) STRICT;

CREATE INDEX record_listing_record_idx  ON record_listings (record_id);
CREATE INDEX record_listing_listing_idx ON record_listings (listing_id);


-- ----------------------------------------------------------------------------
-- 9. Rebuilt transaction children (point at the new parents).
-- ----------------------------------------------------------------------------
CREATE TABLE discounts (
  discount_id       TEXT PRIMARY KEY,
  record_listing_id TEXT NOT NULL REFERENCES record_listings(record_listing_id) ON DELETE CASCADE,
  discount_kind     TEXT NOT NULL CHECK (discount_kind IN ('number', 'percent', 'pcs')),
  discount_value    REAL NOT NULL,
  discount_eff      REAL NOT NULL
) STRICT;

CREATE TABLE record_extras (
  record_extra_id    TEXT PRIMARY KEY,
  record_extra_name  TEXT NOT NULL,
  record_id          TEXT NOT NULL REFERENCES records(record_id) ON DELETE CASCADE,
  record_extra_value REAL NOT NULL,
  record_extra_eff   REAL NOT NULL,
  record_extra_kind  TEXT NOT NULL CHECK (record_extra_kind IN ('number', 'percent'))
) STRICT;


-- ============================================================================
-- 10. BACKFILL from the parked `*_old` tables.
-- ============================================================================
-- Why plain SQL works here: every new row maps 1:1 to an old row, so no new
-- ids have to be minted — we REUSE the old primary keys:
--   products.product_id -> stocks.stock_id / listings.listing_id / codes.code_id
--   records.record_id   -> record_methods.record_method_id
--   record_products.record_product_id -> record_listings.record_listing_id
-- Existing ids are numeric strings (new app rows are ULIDs); both are fine
-- because ids are just unique text (server bounds them to nonempty/max 100).
-- A fan-out seed (several listings per product) WOULD need runtime code,
-- because SQLite cannot generate ULIDs.
-- ============================================================================

-- 10.1 products — drop the slimmed-out columns.
INSERT INTO products (
  product_id, product_name, product_note, product_updated_at, product_sync_at
)
SELECT
  product_id, product_name, product_note, product_updated_at, product_sync_at
FROM products_old;

-- 10.2 stocks — the single existing lot per product. stock_id reuses
--      product_id so product_events can point at it with a join.
INSERT INTO stocks (
  stock_id, product_id, stock_value, stock_capital, stock_created_at, stock_updated_at
)
SELECT
  product_id, product_id, product_stock, product_capital,
  product_updated_at, product_updated_at
FROM products_old;

-- 10.3 listings — one default retail / 1-pcs listing per product.
INSERT INTO listings (
  listing_id, product_id, listing_name, listing_price, listing_unit,
  listing_kind, listing_updated_at
)
SELECT
  product_id, product_id, product_name, product_price, 1, 'retail', product_updated_at
FROM products_old;

-- 10.4 codes — the old single barcode, when present and non-empty.
--      NOTE: do NOT trim() here; old UNIQUE compared raw values, so trimming
--      could collapse ' 123 ' and '123' into a unique-index violation.
INSERT INTO codes (
  code_id, product_id, listing_id, code_value, code_kind, code_updated_at
)
SELECT
  product_id, product_id, product_id, product_barcode, 'barcode', product_updated_at
FROM products_old
WHERE product_barcode IS NOT NULL
  AND product_barcode <> '';

-- 10.5 product_events — repoint at the seed stock (stock_id = product_id).
INSERT INTO product_events (
  product_event_id, product_event_created_at, product_event_sync_at,
  product_event_type, product_event_value, stock_id
)
SELECT
  id, created_at, sync_at, type, value, product_id
FROM product_events_old;

-- 10.6 records — drop method_id; rename the mode enum values.
INSERT INTO records (
  record_id, record_paid_at, record_rounding, record_is_credit, record_cashier,
  record_mode, record_pay, record_note, record_fix, record_customer_name,
  record_customer_phone, record_sub_total, record_total,
  record_updated_at, record_sync_at
)
SELECT
  record_id, record_paid_at, record_rounding, record_is_credit, record_cashier,
  CASE record_mode
    WHEN 'sell' THEN 'outcoming'
    WHEN 'buy'  THEN 'incoming'
    ELSE record_mode
  END AS record_mode,
  record_pay, record_note, record_fix, record_customer_name,
  record_customer_phone, record_sub_total, record_total,
  record_updated_at, record_sync_at
FROM records_old;

-- 10.7 record_methods — the old single method paid the whole `record_pay`.
INSERT INTO record_methods (
  record_method_id, record_id, method_id, record_method_pay
)
SELECT
  record_id, record_id, method_id, record_pay
FROM records_old;

-- 10.8 record_listings — from record_products. `product_capital_raw` is the
--      surviving capital snapshot. Historical listing = the seed retail
--      listing for that product.
INSERT INTO record_listings (
  record_listing_id, listing_id, record_id, record_listing_name,
  record_listing_kind, record_listing_price, record_listing_qty,
  record_listing_capital, record_listing_total
)
SELECT
  rp.record_product_id,
  rp.product_id,                 -- may be NULL (old ON DELETE SET NULL)
  rp.record_id,
  rp.record_product_name,
  'retail',
  rp.record_product_price,
  rp.record_product_qty,
  rp.record_product_capital_raw,
  rp.record_product_total
FROM record_products_old rp;

-- 10.9 discounts — record_product_id maps 1:1 to record_listing_id.
INSERT INTO discounts (
  discount_id, record_listing_id, discount_kind, discount_value, discount_eff
)
SELECT
  discount_id, record_product_id, discount_kind, discount_value, discount_eff
FROM discounts_old;

-- 10.10 record_extras — 1:1.
INSERT INTO record_extras (
  record_extra_id, record_extra_name, record_id,
  record_extra_value, record_extra_eff, record_extra_kind
)
SELECT
  record_extra_id, record_extra_name, record_id,
  record_extra_value, record_extra_eff, record_extra_kind
FROM record_extras_old;

-- 10.11 images — 1:1.
INSERT INTO images (
  image_id, image_order, image_name, image_mime, product_id,
  image_updated_at, image_sync_at
)
SELECT
  image_id, image_order, image_name, image_mime, product_id,
  image_updated_at, image_sync_at
FROM images_old;

-- 10.12 Pending product tombstones -> soft-deleted stub rows.
--
--      !! record tombstones are CORRUPTED and deliberately NOT migrated !! --
--      src/database/record/del-by-id.ts wrote a literal `2` as grave_item_id
--      (a missing `$` in the VALUES template), so all 173 record graves point
--      at the live record '2'. The real ids are unrecoverable. Creating stubs
--      from them would soft-delete a real record, so they are skipped;
--      `graves_old` is retained for inspection. Product graves are valid and
--      are re-materialized as soft-deleted stubs below. The money / extra /
--      money_kind tombstones were never synced server-side; left alone.
INSERT INTO products (
  product_id, product_name, product_note, product_updated_at, product_sync_at,
  product_deleted_at
)
SELECT
  g.grave_item_id, '', '', MIN(g.grave_timestamp), NULL, MIN(g.grave_timestamp)
FROM graves_old g
WHERE g.grave_kind = 'product'
  AND NOT EXISTS (SELECT 1 FROM products p WHERE p.product_id = g.grave_item_id)
GROUP BY g.grave_item_id;

-- 10.13 Force the new aggregates to re-push (the server has never seen
--       stocks/listings/codes/record_methods/record_listings).
--       COMMENTED OUT until the server contract accepts the nested payload —
--       pushing the new shape early will be rejected.
-- UPDATE products SET product_sync_at = NULL;
-- UPDATE records  SET record_sync_at  = NULL;


-- ============================================================================
-- SYNC CONTRACT (proposed)
-- ============================================================================
-- Soft delete
--   A row is deleted by setting `<x>_deleted_at` to the deletion timestamp.
--   It is never physically removed, so the tombstone syncs like any other
--   update. `graves` / `graves_kind` are retired.
--
-- Cursors
--   Each top-level entity keeps `<x>_updated_at` (merge clock) and
--   `<x>_sync_at` (last successful push). Pull asks the server for rows with
--   `<x>_updated_at > since`, including soft-deleted ones. Merge keeps the row
--   with the greater `_updated_at` and honors `_deleted_at`.
--
-- Aggregates
--   product  = products + stocks + listings + codes
--              keyed on product_updated_at. Any child change bumps
--              product_updated_at. Pull returns the FULL child set for a
--              changed product; the client replaces that product's children
--              (hence child tables carry no tombstones / sync_at).
--   record   = records + record_listings + record_methods + record_extras
--              + discounts, keyed on record_updated_at. Immutable snapshots.
--              Deletion via record_deleted_at cascades locally.
--   product_event is synced independently (append-only), keyed on
--   product_event_created_at / product_event_sync_at. Events are not deleted.
--
-- Server contract changes required (later, not in this file)
--   * POST/PULL product payload must be nested (stocks/listings/codes).
--   * Record payload must carry methods + listings (renamed field names).
--   * Retire /api/grave; add `<x>_deleted_at` to server rows.
-- ============================================================================

PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 30;
