-- ============================================================================
-- migration-49   The client-side sync contract, in the schema.
-- ============================================================================
-- Two changes, both required by SYNC-V2.md:
--
--   1. **No cross-group hard foreign keys on a synced table** (§7.2, §7.7). A
--      record is pulled as one aggregate and may reference a supplier, a
--      method, a product or a product event that this device has not received
--      yet — another group's bookmark lags, or the reference is to something
--      this device never has (`record_cashier`). The server deliberately does
--      not enforce these, and a client page must not fail because of one. So the
--      outgoing keys are removed from the four affected tables; the local rows
--      keep the ids as opaque values (store them, show them, never join on
--      them), which is exactly what §7.2 asks for.
--
--      `product_events.stock_id` is removed for the same reason: a lot id is
--      device-local (§8.7). The event row is pulled from another till, whose
--      `stocks` row does not exist here.
--
--      Intra-aggregate keys are kept: a record child's `record_id` lands in the
--      same transaction as its header, and `discounts.record_listing_id` names a
--      listing in the same aggregate. `money.pocket_id` is kept too — that group
--      parks a money row whose pocket has not arrived (§7.5), so the key can
--      always be satisfied before a write.
--
--   2. **The bookmark and the parked rows are durable, and commit with the page
--      they describe** (§9.4.1). `sync_bookmark` holds one integer per group;
--      `sync_parked_money` holds the money rows still waiting for their pocket
--      (§7.5). Both are written inside the same `sync_merge` transaction as the
--      page's rows, so a crash either re-fetches a page (harmless) or skips one
--      (unrecoverable) — never a bookmark that is ahead of its data.
--
--      A database that predates these tables has its bookmarks in `store.json`;
--      `src/services/sync/live.ts` reads those keys once and migrates them into
--      the table. Nothing is seeded here, so the legacy value is still seen.
--
-- Why a full save/drop/recreate rather than `PRAGMA foreign_keys = OFF`:
-- sqlx runs each migration inside a transaction, and `PRAGMA foreign_keys` is a
-- no-op inside one. `DROP TABLE` with enforcement on runs an implicit DELETE
-- FROM, which fires the child `ON DELETE CASCADE` actions — so every table a
-- drop would cascade into is copied to a `_sync_tmp_*` table first, then
-- restored after the rebuild. The set is exactly the seven tables that reference
-- one of the four rebuilt ones, directly or through another of them.
-- ============================================================================

PRAGMA foreign_keys = OFF;      -- no-op under sqlx; kept so the file also runs in the CLI
PRAGMA busy_timeout = 30000;


-- ----------------------------------------------------------------------------
-- 1. Save every row the rebuild can cascade into.
--    `CREATE TABLE … AS SELECT` keeps the values and drops the constraints, so
--    the copy survives the drops below.
-- ----------------------------------------------------------------------------
CREATE TABLE _sync_tmp_records          AS SELECT * FROM records;
CREATE TABLE _sync_tmp_record_listings  AS SELECT * FROM record_listings;
CREATE TABLE _sync_tmp_record_methods   AS SELECT * FROM record_methods;
CREATE TABLE _sync_tmp_record_extras    AS SELECT * FROM record_extras;
CREATE TABLE _sync_tmp_record_images    AS SELECT * FROM record_images;
CREATE TABLE _sync_tmp_product_events   AS SELECT * FROM product_events;
CREATE TABLE _sync_tmp_discounts        AS SELECT * FROM discounts;


-- ----------------------------------------------------------------------------
-- 2. Drop, children first. Every table that referenced one of these is already
--    copied, so the cascade actions have nothing left to damage.
-- ----------------------------------------------------------------------------
DROP TABLE discounts;
DROP TABLE record_listings;
DROP TABLE record_methods;
DROP TABLE record_extras;
DROP TABLE record_images;
DROP TABLE product_events;
DROP TABLE records;


-- ----------------------------------------------------------------------------
-- 3. Recreate, parents first.
-- ----------------------------------------------------------------------------

-- records: `record_supplier_id` and `record_pair_id` no longer reference their
-- targets. Both may dangle: the supplier lives in another group, and the pair is
-- another record that may arrive later (or never).
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
  record_supplier_id    TEXT,
  record_supplier_name  TEXT NOT NULL DEFAULT '',
  record_flag           INTEGER NOT NULL DEFAULT 0,
  record_pair_id        TEXT
) STRICT;

-- record_listings: `product_event_id` and `product_id` are opaque references now.
-- `record_id` is kept: the header lands first in the same transaction.
CREATE TABLE record_listings (
  record_listing_id       TEXT PRIMARY KEY,
  record_listing_group_id TEXT NOT NULL,
  record_id               TEXT NOT NULL REFERENCES records(record_id) ON DELETE CASCADE,
  product_event_id        TEXT,
  product_id              TEXT,
  record_listing_name     TEXT NOT NULL,
  record_listing_kind     TEXT NOT NULL DEFAULT '',
  record_listing_unit     INTEGER NOT NULL DEFAULT 1,
  record_listing_price    REAL NOT NULL,
  record_listing_qty      REAL NOT NULL,
  record_listing_capital  REAL NOT NULL,
  record_listing_total    REAL NOT NULL
) STRICT;

-- record_methods: `method_id` is an opaque reference now.
CREATE TABLE record_methods (
  record_method_id  TEXT PRIMARY KEY,
  record_id         TEXT NOT NULL REFERENCES records(record_id) ON DELETE CASCADE,
  method_id         TEXT NOT NULL,
  record_method_pay REAL NOT NULL
) STRICT;

CREATE TABLE record_extras (
  record_extra_id    TEXT PRIMARY KEY,
  record_extra_name  TEXT NOT NULL,
  record_id          TEXT NOT NULL REFERENCES records(record_id) ON DELETE CASCADE,
  record_extra_value REAL NOT NULL,
  record_extra_eff   REAL NOT NULL,
  record_extra_kind  TEXT NOT NULL CHECK (record_extra_kind IN ('number', 'percent')),
  record_extra_flag  INTEGER NOT NULL DEFAULT 0
) STRICT;

CREATE TABLE record_images (
  record_image_id    TEXT PRIMARY KEY,
  record_image_order INTEGER NOT NULL,
  record_image_name  TEXT NOT NULL,
  record_image_mime  TEXT NOT NULL REFERENCES img_mimes(v),
  record_id          TEXT NOT NULL REFERENCES records(record_id) ON DELETE CASCADE
) STRICT;

-- product_events: `product_id`, `stock_id` and `record_id` are all opaque
-- references now. The journal is pulled from another device, whose products,
-- lots and records this one may not have yet (§7.2, §8.7).
CREATE TABLE product_events (
  product_event_id         TEXT PRIMARY KEY,
  product_event_created_at INTEGER NOT NULL,
  product_event_sync_at    INTEGER,
  product_event_value      INTEGER NOT NULL,
  product_event_capital    REAL NOT NULL,
  product_event_note       TEXT NOT NULL DEFAULT (''),
  product_id               TEXT NOT NULL,
  stock_id                 TEXT,
  record_id                TEXT
) STRICT;

CREATE TABLE discounts (
  discount_id       TEXT PRIMARY KEY,
  discount_group_id TEXT NOT NULL,
  record_listing_id TEXT NOT NULL REFERENCES record_listings(record_listing_id) ON DELETE CASCADE,
  discount_kind     TEXT NOT NULL CHECK (discount_kind IN ('number', 'percent', 'pcs')),
  discount_value    REAL NOT NULL,
  discount_eff      REAL NOT NULL
) STRICT;


-- ----------------------------------------------------------------------------
-- 4. Restore, in the same order the tables were created.
--    Explicit column lists so a future column added between the copy and here
--    cannot silently shift a value into the wrong field.
-- ----------------------------------------------------------------------------
INSERT INTO records (
  record_id, record_created_at, record_paid_at, record_rounding, record_credit_at,
  record_cashier, record_mode, record_pay, record_note, record_fix,
  record_customer_name, record_customer_phone, record_supplier_id,
  record_supplier_name, record_sub_total, record_total,
  record_updated_at, record_sync_at, record_deleted_at, record_flag, record_pair_id
)
SELECT
  record_id, record_created_at, record_paid_at, record_rounding, record_credit_at,
  record_cashier, record_mode, record_pay, record_note, record_fix,
  record_customer_name, record_customer_phone, record_supplier_id,
  record_supplier_name, record_sub_total, record_total,
  record_updated_at, record_sync_at, record_deleted_at, record_flag, record_pair_id
FROM _sync_tmp_records;

INSERT INTO record_listings (
  record_listing_id, record_listing_group_id, record_id, product_event_id, product_id,
  record_listing_name, record_listing_kind, record_listing_unit, record_listing_price,
  record_listing_qty, record_listing_capital, record_listing_total
)
SELECT
  record_listing_id, record_listing_group_id, record_id, product_event_id, product_id,
  record_listing_name, record_listing_kind, record_listing_unit, record_listing_price,
  record_listing_qty, record_listing_capital, record_listing_total
FROM _sync_tmp_record_listings;

INSERT INTO record_methods (record_method_id, record_id, method_id, record_method_pay)
SELECT record_method_id, record_id, method_id, record_method_pay
FROM _sync_tmp_record_methods;

INSERT INTO record_extras (
  record_extra_id, record_extra_name, record_id,
  record_extra_value, record_extra_eff, record_extra_kind, record_extra_flag
)
SELECT
  record_extra_id, record_extra_name, record_id,
  record_extra_value, record_extra_eff, record_extra_kind, record_extra_flag
FROM _sync_tmp_record_extras;

INSERT INTO record_images (
  record_image_id, record_image_order, record_image_name, record_image_mime, record_id
)
SELECT record_image_id, record_image_order, record_image_name, record_image_mime, record_id
FROM _sync_tmp_record_images;

INSERT INTO product_events (
  product_event_id, product_event_created_at, product_event_sync_at,
  product_event_value, product_event_capital, product_event_note,
  product_id, stock_id, record_id
)
SELECT
  product_event_id, product_event_created_at, product_event_sync_at,
  product_event_value, product_event_capital, product_event_note,
  product_id, stock_id, record_id
FROM _sync_tmp_product_events;

INSERT INTO discounts (
  discount_id, discount_group_id, record_listing_id, discount_kind, discount_value, discount_eff
)
SELECT
  discount_id, discount_group_id, record_listing_id, discount_kind, discount_value, discount_eff
FROM _sync_tmp_discounts;


-- ----------------------------------------------------------------------------
-- 5. Recreate every index the dropped tables carried.
-- ----------------------------------------------------------------------------
CREATE INDEX record_date_idx
  ON records (COALESCE(record_paid_at, record_credit_at, record_created_at))
  WHERE record_deleted_at IS NULL;

CREATE INDEX record_credit_open_idx
  ON records (record_credit_at)
  WHERE record_paid_at IS NULL AND record_deleted_at IS NULL;

CREATE INDEX record_pair_idx
  ON records (record_pair_id)
  WHERE record_pair_id IS NOT NULL;

CREATE INDEX record_listing_record_idx  ON record_listings (record_id);
CREATE INDEX record_listing_group_idx   ON record_listings (record_listing_group_id);
CREATE INDEX record_listing_event_idx   ON record_listings (product_event_id);
CREATE INDEX record_listing_product_idx ON record_listings (product_id);

CREATE INDEX record_method_record_idx ON record_methods (record_id);
CREATE INDEX record_image_record_idx  ON record_images (record_id);

CREATE INDEX product_event_product_idx ON product_events (product_id);
CREATE INDEX product_event_stock_idx   ON product_events (stock_id);
CREATE INDEX product_event_record_idx  ON product_events (record_id);
CREATE INDEX product_event_product_time_idx
  ON product_events (product_id, product_event_created_at DESC, product_event_id DESC);

CREATE INDEX discount_listing_idx ON discounts (record_listing_id);
CREATE INDEX discount_group_idx   ON discounts (discount_group_id);


-- ----------------------------------------------------------------------------
-- 6. The durable sync state (§9.4.1). Empty on purpose: a legacy bookmark still
--    lives in store.json, and live.ts migrates it the first time it reads.
-- ----------------------------------------------------------------------------
CREATE TABLE sync_bookmark (
  group_name TEXT PRIMARY KEY,
  seq        INTEGER NOT NULL
) STRICT;

CREATE TABLE sync_parked_money (
  money_id TEXT PRIMARY KEY,
  seq      INTEGER NOT NULL,
  row_json TEXT NOT NULL
) STRICT;


-- ----------------------------------------------------------------------------
-- 7. The copies have served their purpose.
-- ----------------------------------------------------------------------------
DROP TABLE _sync_tmp_discounts;
DROP TABLE _sync_tmp_product_events;
DROP TABLE _sync_tmp_record_images;
DROP TABLE _sync_tmp_record_extras;
DROP TABLE _sync_tmp_record_methods;
DROP TABLE _sync_tmp_record_listings;
DROP TABLE _sync_tmp_records;


PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 30;
