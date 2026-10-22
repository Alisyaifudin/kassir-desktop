-- ============================================================================
-- migration-43   Schema rewrite: decompose the aggregates, add soft delete.
-- ============================================================================
-- The schema half of the reshaping. The data half — moving every row out of the
-- parked `*_old` tables — is migration-44, so the two can be read, reviewed and
-- retried separately. Both run in one pass when the app starts.
--
-- Re-baselined. This file now also carries the schema work that shipped as
-- migrations 45-53 (the cart's customer/supplier text, the code snapshot on
-- `tx_listings`, three record dates and the supplier snapshot, the read
-- indexes) plus `records.record_flag`. Those files were folded here when the
-- history was squashed to 43 + 44, so a database from the old 43-53 lineage no
-- longer matches it and has to start from a fresh `data.db`.
--
-- Goals
--   1. Replace the `graves` tombstone table with `*_deleted_at` soft-delete
--      columns on top-level sync entities.
--   2. Decompose `products` into  stocks / listings.
--   3. Split record payment methods into a dedicated `record_methods` table.
--   4. Replace `record_products` with `record_listings` (no product FK).
--   5. Repoint `product_events` at `stocks` instead of `products`, and give it a
--      back-reference to the record that produced it.
--   6. Add `suppliers` — the counterparty for a purchase (outcoming), where
--      `customers` is the counterparty for a sale (incoming).
--   7. Rename the money-kind table to `pockets`.
--   8. Port the `tx.db` cart tables into `data.db` under the `tx_` namespace.
--   9. Add `record_images` — the pictures attached to a record, mirroring the
--      product `images` gallery.
--
-- Conventions (locked in this revision)
--   * Column naming: `<singular_table>_<field>`; FK columns are named after the
--     referenced table (`product_id`, `record_id`, `listing_id`, ...).
--   * Soft-delete name: `<singular_table>_deleted_at`.
--   * Sync metadata: `<singular_table>_updated_at` / `<singular_table>_sync_at`.
--   * Mutable syncable rows carry the full sync trio:
--     `<singular>_updated_at` + `<singular>_sync_at` + `<singular>_deleted_at`.
--     This includes the product children that are edited directly
--     (`listings`, `images`).
--   * `stocks` is a LOCAL CACHE derived from the append-only `product_events`
--     journal (stock is event-sourced). It is never synced on its own, so it
--     carries `_updated_at` only — no `_sync_at` / `_deleted_at`.
--   * Immutable aggregate members (record children) carry NO tombstones / sync
--     metadata; they are rewritten with their parent (`records`).
--     Append-only journals (`product_events`) carry `<x>_created_at` /
--     `<x>_sync_at` and are never deleted.
--   * `cashiers` is NOT sync-able.
--
-- Ground rules for this draft
--   * NO `DROP TABLE`. Every replaced table is parked as `<name>_old`, and
--     migration-44 empties them into the new shape.
--   * No row moves in this file.
--   * sqlx runs this file inside a transaction and ignores `PRAGMA
--     foreign_keys` inside a transaction, so foreign_keys stays ON (sqlx
--     default). `ALTER TABLE ... RENAME` therefore rewrites FK references,
--     which is why every dependent table is rebuilt against the new parent.
-- ============================================================================

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
ALTER TABLE money_kind       RENAME TO money_kind_old;
ALTER TABLE money            RENAME TO money_old;


-- ----------------------------------------------------------------------------
-- 2. `<singular>_deleted_at` on top-level sync entities that are NOT rebuilt.
--    (`methods.method_deleted_at` already conforms — left untouched.)
-- ----------------------------------------------------------------------------
ALTER TABLE extras      ADD COLUMN extra_deleted_at       INTEGER;
ALTER TABLE customers   ADD COLUMN customer_deleted_at    INTEGER;
ALTER TABLE socials     ADD COLUMN social_deleted_at      INTEGER;


-- ----------------------------------------------------------------------------
-- 2b. `money_kind` → `pockets`.
--
--     A rename, and it belongs here rather than in 39 because 39 and 41 have
--     shipped: sqlx keeps a fingerprint of each migration's text, so editing
--     theirs fails the migrator on every installed database. 43 has never
--     shipped, and 39 leaves `money_kind` behind on every lineage — fresh
--     installs and databases that have been upgrading for years alike — so this
--     can run unconditionally and end with one vocabulary instead of two.
--
--     Rebuilt rather than column-renamed: whether SQLite rewrites a `REFERENCES`
--     clause during a RENAME depends on `PRAGMA legacy_alter_table`, which the
--     driver and the CLI default differently, so the same statements could leave
--     two different schemas. A rebuild gives one. `money` is the only table that
--     points at the kind table, and both are parked in section 1.
--
--     `pocket_ordering` carries over what 41 added, and `pocket_deleted_at` /
--     `money_deleted_at` are created here rather than being added to the old
--     names by section 2.
-- ----------------------------------------------------------------------------
CREATE TABLE pockets (
  pocket_id         TEXT PRIMARY KEY,
  pocket_name       TEXT NOT NULL,
  pocket_type       TEXT NOT NULL DEFAULT 'absolute' CHECK (pocket_type IN ('absolute', 'change')),
  pocket_ordering   INTEGER NOT NULL DEFAULT 0,
  pocket_updated_at INTEGER NOT NULL,
  pocket_sync_at    INTEGER,
  pocket_deleted_at INTEGER
) STRICT;

INSERT INTO pockets (
  pocket_id, pocket_name, pocket_type, pocket_ordering,
  pocket_updated_at, pocket_sync_at
)
SELECT
  money_kind_id, money_kind_name, money_kind_type, money_kind_ordering,
  money_kind_updated_at, money_kind_sync_at
FROM money_kind_old;

CREATE TABLE money (
  money_id         TEXT PRIMARY KEY,
  timestamp        INTEGER NOT NULL,
  money_value      REAL NOT NULL,
  pocket_id        TEXT NOT NULL REFERENCES pockets(pocket_id) ON DELETE CASCADE,
  money_note       TEXT NOT NULL DEFAULT (''),
  money_updated_at INTEGER NOT NULL,
  money_sync_at    INTEGER,
  money_deleted_at INTEGER
) STRICT;

INSERT INTO money (
  money_id, timestamp, money_value, pocket_id, money_note,
  money_updated_at, money_sync_at
)
SELECT
  money_id, timestamp, money_value, money_kind_id, money_note,
  money_updated_at, money_sync_at
FROM money_old;


-- ----------------------------------------------------------------------------
-- 3. Enums and lookup tables.
-- ----------------------------------------------------------------------------
CREATE TABLE code_kind_enum (
  v TEXT PRIMARY KEY
) STRICT;

INSERT INTO code_kind_enum (v) VALUES ('barcode'), ('qr');

-- Renames the old ('sell', 'buy') enum. The values describe the direction MONEY
-- moved, which is the opposite of the goods: a sale takes money in, a purchase
-- sends it out. `records_old` still references `mode_enum_old` (sell/buy); the
-- migration-44 backfill maps: sell -> incoming, buy -> outcoming.
--
-- Careful when reading stock code with these names: a sale (`incoming`) consumes
-- stock, a purchase (`outcoming`) receives it. The enum follows the till, not the
-- warehouse.
CREATE TABLE mode_enum (
  v TEXT PRIMARY KEY
) STRICT;

INSERT INTO mode_enum (v) VALUES ('incoming'), ('outcoming');

-- `img_mimes` (migration-36) gains webp. This is the row that had been appended
-- to migration-42 after that file had already been applied, and `prod` carries
-- as its own 46; both would break the fingerprints of databases that ran the
-- earlier text, so it lives here instead — in the file nothing has recorded yet.
-- OR IGNORE so a database that already got it from either place still migrates.
INSERT OR IGNORE INTO img_mimes (v) VALUES ('image/webp');


-- ----------------------------------------------------------------------------
-- 4. `products` — slimmed down.
--    Removed: product_barcode (-> listings.listing_code), product_price (-> listings),
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

-- Backfilled in migration-44.


-- ----------------------------------------------------------------------------
-- 5. Product children.
--    `listings`, `properties` and `product_names` are syncable mutable rows;
--    `stocks` is a local cache of the event-sourced `product_events` journal
--    (not synced).
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
--   listing_code  the listing's single code value (barcode / qr), or NULL.
--   listing_code_kind  'barcode' | 'qr'; NULL when listing_code is NULL.
-- TODO(q1): default `retail` is a guess — keep or make it required input?
CREATE TABLE listings (
  listing_id         TEXT PRIMARY KEY,
  product_id         TEXT NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
  listing_name       TEXT NOT NULL,
  listing_price      REAL NOT NULL,
  listing_unit       INTEGER NOT NULL DEFAULT 1,
  listing_kind       TEXT NOT NULL DEFAULT 'retail',
  listing_code       TEXT,                                 -- at most one code per listing
  listing_code_kind  TEXT REFERENCES code_kind_enum(v),    -- 'barcode' | 'qr'
  listing_updated_at INTEGER NOT NULL,
  listing_sync_at    INTEGER,
  listing_deleted_at INTEGER
) STRICT;

CREATE INDEX listing_product_idx ON listings (product_id);

-- The code now lives on its listing (at most one). As before, only `barcode`
-- is globally unique; `listing_code_kind` is NULL whenever `listing_code` is.
CREATE UNIQUE INDEX listing_barcode_unique ON listings (listing_code)
  WHERE listing_code_kind = 'barcode' AND listing_deleted_at IS NULL;
CREATE INDEX listing_code_idx ON listings (listing_code);

-- properties: arbitrary key/value metadata attached to a product.
--   property_key   user-defined label (e.g. 'origin', 'expiry', 'supplier').
--   property_value arbitrary text; the DB does not interpret it, so store
--                  JSON here when a value needs structure.
--   At most one live value per key per product (the partial unique index lets
--   a soft-deleted row be replaced by a new one with the same key).
--   Syncable mutable child: carries the full sync trio like `listings`.
CREATE TABLE properties (
  property_id         TEXT PRIMARY KEY,
  product_id          TEXT NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
  property_key        TEXT NOT NULL,
  property_value      TEXT NOT NULL,
  property_updated_at INTEGER NOT NULL,
  property_sync_at    INTEGER,
  property_deleted_at INTEGER
) STRICT;

CREATE UNIQUE INDEX property_product_key_unique
  ON properties (product_id, property_key) WHERE property_deleted_at IS NULL;
CREATE INDEX property_product_idx ON properties (product_id);

-- product_names: alternative names a product can also be looked up under.
--   Zero or more per product (the default); each row is one alias (e.g. "Coke"
--   for "Coca-Cola"). Search matches any of them in addition to
--   `products.product_name`.
--   At most one live row per value per product (the partial unique index lets
--   a soft-deleted name be re-added, but rejects a live duplicate). Comparison
--   is exact — normalize casing/whitespace in app code before insert.
--   Syncable mutable child: carries the full sync trio like `listings`.
CREATE TABLE product_names (
  product_name_id         TEXT PRIMARY KEY,
  product_id              TEXT NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
  product_name_value      TEXT NOT NULL,
  product_name_updated_at INTEGER NOT NULL,
  product_name_sync_at    INTEGER,
  product_name_deleted_at INTEGER
) STRICT;

CREATE UNIQUE INDEX product_name_product_value_unique
  ON product_names (product_id, product_name_value) WHERE product_name_deleted_at IS NULL;
CREATE INDEX product_name_product_idx ON product_names (product_id);
CREATE INDEX product_name_value_idx   ON product_names (product_name_value);


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
-- 7. `product_events` — created in §8b, after `records`, because it references
--    `records`; `record_listings` points back at it.
-- ----------------------------------------------------------------------------


-- ----------------------------------------------------------------------------
-- 8. `records` — drop `method_id` (moved to `record_methods`), and carry the
--    three dates a record really has.
--
--    A record used to hold one `record_paid_at` plus an `record_is_credit`
--    flag. Those are not the same fact: a credit sale is *created* when it is
--    rung up, *settled* later, and keeps its credit date afterwards. So:
--      record_created_at  immutable creation time
--      record_paid_at     settlement time; NULL while a credit is outstanding
--      record_credit_at   credit date; kept after settlement
--    `record_flag` is local, unsynced bookkeeping; the app owns its bits.
--    `record_pay` stays as a denormalized cache of SUM(record_methods...pay).
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
  record_supplier_name  TEXT NOT NULL DEFAULT '',
  record_flag           INTEGER NOT NULL DEFAULT 0
) STRICT;

-- ----------------------------------------------------------------------------
-- 8b. `product_events` — the append-only stock journal and source of truth.
--     Every row is a movement of one lot:
--       * `product_event_value`   SIGNED delta (+/-/0) in base pcs;
--       * `product_event_capital` the lot's capital as of this event (NOT NULL),
--         so a capital correction is just another event with delta 0.
--     There is no `type` column. Regenerating the local `stocks` cache is
--     therefore total and needs no "creation marker": value = SUM(delta),
--     capital = the newest event's capital, created_at = the oldest event's
--     created_at.
--
--     DENORMALIZATION (intentional): `product_id` is repeated on every event
--     even though `stock_id -> stocks.product_id` already reaches it. It keeps
--     the journal self-sufficient on a fresh device — `stocks` is only a local
--     cache, and rebuilding it from the journal alone needs to know each
--     event's product without relying on the rows being rebuilt. `stock_id`
--     still keys every event into the cache, and lots are never deleted, so the
--     FK never costs us journal rows.
--
--     `record_id` is nullable: manual corrections (`stock.adjust` /
--     `stock.consume` from the UI) belong to no record, and pre-journal records
--     have no link. The record commit path stamps it. `record_listings` also
--     points at the exact event per sold portion (see §8c), so the two links are
--     intentional: `record_id` finds and removes all movements of a record,
--     while `record_listings.product_event_id` attributes one portion's move.
--     Created here, after `records`, so `record_id` can be declared inline.
-- ----------------------------------------------------------------------------
CREATE TABLE product_events (
  product_event_id         TEXT PRIMARY KEY,
  product_event_created_at INTEGER NOT NULL,
  product_event_sync_at    INTEGER,
  product_event_value      INTEGER NOT NULL, -- signed delta (+/-/0)
  product_event_capital    REAL NOT NULL,    -- the lot's capital as of this event
  product_event_note       TEXT NOT NULL DEFAULT (''), -- free text, e.g. manual stock-out reason
  product_id               TEXT NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
  stock_id                 TEXT REFERENCES stocks(stock_id) ON DELETE CASCADE, -- NULL = dangling (unlinked) event
  record_id                TEXT REFERENCES records(record_id) ON DELETE SET NULL
) STRICT;

CREATE INDEX product_event_product_idx ON product_events (product_id);
CREATE INDEX product_event_stock_idx   ON product_events (stock_id);
CREATE INDEX product_event_record_idx  ON product_events (record_id);

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

-- 8c. record_listings: one row per *lot portion* of a sold line.
--
--     A line can consume from several lots (FIFO), so the line the cashier
--     entered is split into portions here. `record_listing_group_id` is the
--     entered line: the read model groups the portions back into one display
--     line (receipt, record detail), so the split stays internal. `listing_id`
--     is gone: the product is reached through the event's lot, and the
--     `product_id` snapshot below keeps it available without a catalog row.
--
--       * `record_listing_group_id` — the entered line; portions share it.
--       * `product_event_id` — the movement this portion caused; NULL for a
--         manual line with no stock, or a pre-journal line.
--       * `product_id` — snapshot replacing `listing_id`: display/link, and the
--         mode-flip / delete compensation. Nullable, like the old
--         `record_products.product_id`.
--       * `record_listing_unit` — snapshot of `listings.listing_unit` (pcs per
--         listing unit), so a qty still becomes pcs after `listing_id` is gone
--         and history keeps the unit it was sold in.
--       * `record_listing_qty` is REAL: a portion split at a lot boundary can be
--         a fraction of a listing unit (1.5 kg) even though the pcs are whole.
--       * `record_listing_capital` is the single capital snapshot (the old
--         `product_capital_raw` / `product_capital` split is gone).
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

CREATE INDEX record_listing_record_idx  ON record_listings (record_id);
CREATE INDEX record_listing_group_idx   ON record_listings (record_listing_group_id);
CREATE INDEX record_listing_event_idx   ON record_listings (product_event_id);
CREATE INDEX record_listing_product_idx ON record_listings (product_id);


-- ----------------------------------------------------------------------------
-- 9. Rebuilt transaction children (point at the new parents).
-- ----------------------------------------------------------------------------
CREATE TABLE discounts (
  discount_id       TEXT PRIMARY KEY,
  -- Shared by the per-portion copies of one entered discount, so the read model
  -- can sum their `eff` and show the discount once for the line.
  discount_group_id TEXT NOT NULL,
  record_listing_id TEXT NOT NULL REFERENCES record_listings(record_listing_id) ON DELETE CASCADE,
  discount_kind     TEXT NOT NULL CHECK (discount_kind IN ('number', 'percent', 'pcs')),
  discount_value    REAL NOT NULL,
  discount_eff      REAL NOT NULL
) STRICT;

CREATE INDEX discount_listing_idx ON discounts (record_listing_id);
CREATE INDEX discount_group_idx   ON discounts (discount_group_id);

CREATE TABLE record_extras (
  record_extra_id    TEXT PRIMARY KEY,
  record_extra_name  TEXT NOT NULL,
  record_id          TEXT NOT NULL REFERENCES records(record_id) ON DELETE CASCADE,
  record_extra_value REAL NOT NULL,
  record_extra_eff   REAL NOT NULL,
  record_extra_kind  TEXT NOT NULL CHECK (record_extra_kind IN ('number', 'percent'))
) STRICT;


-- ----------------------------------------------------------------------------
-- 9b. `record_images` — the pictures attached to a record.
--
--     Mirrors `images` (the product gallery) with `record_id` in place of
--     `product_id`: the bytes live on disk under AppData/images/, keyed by the
--     row id, and the row carries the original name, its mime and the order.
--
--     A record child, so no sync trio — like `record_extras` and
--     `record_listings` it is an immutable part of the record aggregate and is
--     rewritten with its parent. A record has zero or many. New table: nothing
--     to park in §1 and nothing to copy in migration-44.
-- ----------------------------------------------------------------------------
CREATE TABLE record_images (
  record_image_id    TEXT PRIMARY KEY,
  record_image_order INTEGER NOT NULL,
  record_image_name  TEXT NOT NULL,
  record_image_mime  TEXT NOT NULL REFERENCES img_mimes(v),
  record_id          TEXT NOT NULL REFERENCES records(record_id) ON DELETE CASCADE
) STRICT;

CREATE INDEX record_image_record_idx ON record_images (record_id);


-- ----------------------------------------------------------------------------
-- 10. `product_events` -> the `records` row that produced it.
--
--     Declared inline on the table (§8b) now that it is created after `records`,
--     so there is no ADD COLUMN. Nullable by design: manual corrections belong
--     to no record, and pre-journal records have no link. The per-portion link
--     lives on `record_listings.product_event_id`; this one is for whole-record
--     operations (delete / mode flip).
--
--     KNOWN DEVIATION from the sync contract at the foot of this file, which
--     declares `product_event` append-only ("Events are not deleted") because its
--     cursor can only express `product_event_created_at` /
--     `product_event_sync_at`. `record.delete.byId` deletes rows regardless, so a
--     deleted record's stock effect can survive on a peer until it re-pulls the
--     affected product.
-- ----------------------------------------------------------------------------


-- ----------------------------------------------------------------------------
-- 11. The `tx_*` cart tables, ported from the standalone `tx.db`.
--
--     tx.db held the active POS cart. Its tables live here now, under the `tx_`
--     namespace, so they sit alongside data.db's catalog/record tables without
--     collisions.
--
--     Naming / shape changes vs the tx.db originals
--       * Every table is prefixed `tx_`, and every column is renamed to the
--         `<singular>_<field>` convention used across data.db.
--       * `transactions` -> `tx_records` (PK `tab` INTEGER -> `tx_record_id`
--                           TEXT; adds `tx_record_order` / `tx_record_flag`,
--                           `tx_record_rounding` and `tx_record_supplier_id`,
--                           drops `tx_record_created_at` and the
--                           `tx_record_manual_*` columns).
--       * `extras`       -> `tx_extras` (drops `db_extra_id`; adds
--                           `tx_extra_eff`).
--       * `products`     -> `tx_listings`: no longer denormalizes product data;
--                           references the live `listings` table via `listing_id`
--                           (ON DELETE SET NULL).
--       * `discounts`    -> `tx_discounts`, now parented by `tx_listings`.
--       * dropped: `versions` (unused) and `discount_kind_enum` (its three values
--         are now a CHECK on `tx_discounts.tx_disc_kind`).
--
--     New (not sourced from tx.db):
--       * `tx_methods` — one row per payment on a `tx_records` row
--         (`tx_method_id`, `tx_record_id`, `method_id`, `tx_method_value`).
--         Its own id, not `(record, method)`, so a method can be paid twice.
--
--     The parked manual-line columns are gone: a hand-entered line is just a
--     `tx_listings` row whose `listing_id` is NULL.
--
--     Deliberately NOT ported:
--       * `_sqlx_migrations` — sqlx's own bookkeeping for tx.db, which data.db
--         already owns (tauri-plugin-sql). Copying it would clash with and
--         corrupt data.db's migration history.
--     No cart rows move across either: the old cart was transient working state.
-- ----------------------------------------------------------------------------
-- Main table. Was `transactions`; renamed to `tx_records`.
CREATE TABLE tx_records (
  tx_record_id              TEXT PRIMARY KEY,
  tx_record_order           INTEGER NOT NULL, -- user-controlled tab order (re-arrangeable; not unique by design)
  tx_record_flag            INTEGER NOT NULL DEFAULT 0, -- local flags; bit 0 = the active draft
  tx_record_title           TEXT NOT NULL,
  -- 'incoming' is a sale, which is what the legacy cart defaulted to ('sell').
  tx_record_mode            TEXT NOT NULL DEFAULT ('incoming') CHECK (tx_record_mode IN ('incoming', 'outcoming')),
  tx_record_query           TEXT NOT NULL DEFAULT (''),
  tx_record_fix             INTEGER NOT NULL DEFAULT 0,
  tx_record_note            TEXT NOT NULL DEFAULT (''),
  tx_record_rounding        REAL NOT NULL DEFAULT 0,
  tx_record_customer_id     TEXT, -- change from INTEGER TO TEXT
  tx_record_supplier_id     TEXT, -- the counterparty for an outcoming (purchase) draft
  -- Pending counterparty text, typed in the cart before the submit resolves it.
  tx_record_customer_name   TEXT NOT NULL DEFAULT '',
  tx_record_customer_phone  TEXT NOT NULL DEFAULT '',
  tx_record_supplier_name   TEXT NOT NULL DEFAULT ''
) STRICT;


-- Was `extras` (dropped `db_extra_id`; added `tx_extra_eff`).
CREATE TABLE tx_extras (
  tx_extra_order     INTEGER PRIMARY KEY,
  tx_extra_id        TEXT NOT NULL UNIQUE,
  tx_record_id       TEXT NOT NULL REFERENCES tx_records(tx_record_id) ON DELETE CASCADE,
  tx_extra_kind      TEXT NOT NULL CHECK (tx_extra_kind IN ('percent', 'number')),
  tx_extra_name      TEXT NOT NULL,
  tx_extra_value     REAL NOT NULL,
  tx_extra_eff       REAL NOT NULL
) STRICT;

CREATE INDEX tx_idx_extras_extra_id ON tx_extras(tx_extra_id);


-- Not in tx.db: the payments on a `tx_records` row. One row per payment;
-- `tx_method_value` is the amount applied to that method. A row has its own id
-- rather than `(record, method)`, so the same method can be paid twice.
CREATE TABLE tx_methods (
  tx_method_id          TEXT PRIMARY KEY,
  tx_record_id          TEXT NOT NULL REFERENCES tx_records(tx_record_id) ON DELETE CASCADE,
  method_id             TEXT NOT NULL REFERENCES methods(method_id) ON DELETE CASCADE,
  tx_method_value       INTEGER NOT NULL
) STRICT;

CREATE INDEX tx_idx_methods_record ON tx_methods(tx_record_id);


-- Was `products` (now a listing snapshot referencing the live catalog).
CREATE TABLE tx_listings (
  tx_listing_id          TEXT PRIMARY KEY,
  tx_record_id           TEXT NOT NULL REFERENCES tx_records(tx_record_id) ON DELETE CASCADE,
  listing_id             TEXT REFERENCES listings(listing_id) ON DELETE SET NULL,
  tx_listing_name        TEXT NOT NULL,
  tx_listing_price       REAL NOT NULL,
  tx_listing_unit        INTEGER NOT NULL,
  tx_listing_qty         INTEGER NOT NULL,
  tx_listing_kind        TEXT NOT NULL DEFAULT 'retail',
  -- The editable code the draft's listing grid shows, snapshotted like name
  -- and price so the cart keeps what was typed even if the catalog changes.
  tx_listing_code        TEXT NOT NULL DEFAULT ''
) STRICT;




-- Was `discounts`.
CREATE TABLE tx_discounts (
  tx_disc_order    INTEGER PRIMARY KEY,
  tx_disc_id       TEXT NOT NULL UNIQUE,
  tx_listing_id    TEXT NOT NULL REFERENCES tx_listings(tx_listing_id) ON DELETE CASCADE,
  tx_disc_value    REAL NOT NULL DEFAULT 0,
  tx_disc_eff      REAL NOT NULL DEFAULT 0,
  tx_disc_kind     TEXT NOT NULL DEFAULT 'percent' CHECK (tx_disc_kind IN ('number', 'percent', 'pcs'))
) STRICT;


-- Not in tx.db: the images attached to a `tx_records` row. A bridge only — the
-- bytes live on disk under AppData/images/, keyed by `tx_image_name` (the same
-- key the product gallery and `record_images` use); this row is the reference.
-- On submit the references move to `record_images`; abandoning the draft deletes
-- the rows and their files.
CREATE TABLE tx_images (
  tx_image_id    TEXT PRIMARY KEY,
  tx_image_order INTEGER NOT NULL,
  tx_image_name  TEXT NOT NULL,
  tx_image_mime  TEXT NOT NULL REFERENCES img_mimes(v),
  tx_record_id   TEXT NOT NULL REFERENCES tx_records(tx_record_id) ON DELETE CASCADE
) STRICT;

CREATE INDEX tx_idx_images_record ON tx_images(tx_record_id);


-- ----------------------------------------------------------------------------
-- 12. `suppliers` — the counterparty for a purchase (outcoming).
--
--     New table: nothing to park and nothing to backfill, so it is created
--     here rather than rebuilt. It mirrors `customers` (the sale-side
--     counterparty) and is a top-level sync entity, so it carries the full
--     sync trio.
--
--     The contact field is a free-text `supplier_note` rather than a phone
--     number: a restock counterparty is identified by who they are and
--     whatever the operator needs to remember about them, and a single phone
--     column does not fit a market stall or a WhatsApp handle.
-- ----------------------------------------------------------------------------
CREATE TABLE suppliers (
  supplier_id         TEXT PRIMARY KEY,
  supplier_name       TEXT NOT NULL,
  supplier_note       TEXT NOT NULL DEFAULT (''),
  supplier_updated_at INTEGER NOT NULL,
  supplier_sync_at    INTEGER,
  supplier_deleted_at INTEGER
) STRICT;


-- ============================================================================
-- Read indexes.
--
-- Every record read filters — and most order — on the same expression,
-- `COALESCE(record_paid_at, record_credit_at, record_created_at)`: the history
-- list, Beranda's day summary, the comprehensive listing search and the debt
-- table. SQLite cannot use a single-column index for a COALESCE, so without
-- the first one below each of those screens is a full scan plus a temp B-tree
-- sort over the whole sales history.
-- ============================================================================
CREATE INDEX record_date_idx
  ON records (COALESCE(record_paid_at, record_credit_at, record_created_at))
  WHERE record_deleted_at IS NULL;

-- The open-credit list (Money > Debt): outstanding rows only, newest first.
CREATE INDEX record_credit_open_idx
  ON records (record_credit_at)
  WHERE record_paid_at IS NULL AND record_deleted_at IS NULL;

-- The product detail > Riwayat pager is a keyset read ordered by
-- (created_at DESC, id DESC); keep that exact order in the index so each page
-- is a range scan plus a LIMIT instead of a scan of the product's whole journal.
CREATE INDEX product_event_product_time_idx
  ON product_events (product_id, product_event_created_at DESC, product_event_id DESC);


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
--   product  = products + listings + properties + product_names + images
--              keyed on product_updated_at. Any child change bumps
--              product_updated_at. These children are mutable rows carrying
--              their own `_updated_at` / `_sync_at` / `_deleted_at`.
--   stocks    = LOCAL CACHE, not synced. Rebuilt by replaying `product_events`
--              (ordered by product_event_created_at).
--   record   = records + record_listings + record_methods + record_extras
--              + record_images + discounts, keyed on record_updated_at.
--              Immutable snapshots.
--              Deletion via record_deleted_at cascades locally.
--   product_event is synced independently (append-only), keyed on
--   product_event_created_at / product_event_sync_at. Events are not deleted.
--
-- Server contract changes required (later, not in this file)
--   * POST/PULL product payload must be nested (stocks/listings).
--   * Record payload must carry methods + listings (renamed field names).
--   * Retire /api/grave; add `<x>_deleted_at` to server rows.
-- ============================================================================

PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 30;
