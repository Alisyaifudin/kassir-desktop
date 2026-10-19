-- ============================================================================
-- migration-44   Backfill: move the parked rows into the new schema.
-- ============================================================================
-- The data half of migration-43. 43 rebuilds the schema and parks every table it
-- replaces as `<name>_old`; this file moves the rows across, so the two can be
-- reviewed and retried separately — the DDL does not have to be re-read to check
-- a copy, and a copy that fails can be re-run without touching the schema.
--
-- There is no DDL here: every statement is INSERT ... SELECT. The parked tables
-- are left in place afterwards (43's ground rule is that nothing is dropped).
--
-- `foreign_keys` is turned off for the copy, as in 43. Under sqlx the pragma is a
-- no-op inside a transaction, so foreign keys stay ON there and the statements
-- are ordered parent-first to satisfy them either way.
-- ============================================================================

PRAGMA foreign_keys = OFF;      -- no-op under sqlx; kept so the file also runs in the CLI
PRAGMA busy_timeout = 30000;


-- ============================================================================
-- BACKFILL from the parked `*_old` tables.
-- ============================================================================
-- Why plain SQL works here: every new row maps 1:1 to an old row, so no new
-- ids have to be minted — we REUSE the old primary keys:
--   products.product_id -> stocks.stock_id / listings.listing_id
--   records.record_id   -> record_methods.record_method_id
--   record_products.record_product_id -> record_listings.record_listing_id
-- Existing ids are numeric strings (new app rows are ULIDs); both are fine
-- because ids are just unique text (server bounds them to nonempty/max 100).
-- A fan-out seed (several listings per product) WOULD need runtime code,
-- because SQLite cannot generate ULIDs.
-- ============================================================================

-- 1 products — drop the slimmed-out columns.
INSERT INTO products (
  product_id, product_name, product_note, product_updated_at, product_sync_at
)
SELECT
  product_id, product_name, product_note, product_updated_at, product_sync_at
FROM products_old;

-- 2 stocks — the single existing lot per product. stock_id reuses
--      product_id so product_events can point at it with a join.
INSERT INTO stocks (
  stock_id, product_id, stock_value, stock_capital, stock_created_at, stock_updated_at
)
SELECT
  product_id, product_id, product_stock, product_capital,
  product_updated_at, product_updated_at
FROM products_old;

-- 3 listings — one default retail / 1-pcs listing per product.
INSERT INTO listings (
  listing_id, product_id, listing_name, listing_price, listing_unit,
  listing_kind, listing_updated_at
)
SELECT
  product_id, product_id, product_name, product_price, 1, 'retail', product_updated_at
FROM products_old;

-- 4 code — attach the old single barcode to the seed retail listing.
--      NOTE: do NOT trim() here; the old UNIQUE index compared raw values, so
--      trimming could collapse ' 123 ' and '123' into a unique-index violation.
UPDATE listings
SET listing_code      = (SELECT p.product_barcode FROM products_old p
                         WHERE p.product_id = listings.product_id),
    listing_code_kind = 'barcode'
WHERE EXISTS (
  SELECT 1 FROM products_old p
  WHERE p.product_id = listings.product_id
    AND p.product_barcode IS NOT NULL
    AND p.product_barcode <> ''
);

-- 5 product_events — repoint at the seed stock (stock_id = product_id).
--      `type` is gone: the old positive `value` becomes a signed delta, so
--      `dec` events are negated. Every event carries the lot's capital, so the
--      seed lot's `product_capital` is written on all of its events.
INSERT INTO product_events (
  product_event_id, product_event_created_at, product_event_sync_at,
  product_event_value, product_event_capital, product_id, stock_id
)
SELECT
  pe.id, pe.created_at, pe.sync_at,
  CASE WHEN pe.type = 'dec' THEN -pe.value ELSE pe.value END,
  po.product_capital,
  pe.product_id, pe.product_id
FROM product_events_old pe
JOIN products_old po ON po.product_id = pe.product_id;

-- 6 records — drop method_id; rename the mode enum values.
INSERT INTO records (
  record_id, record_paid_at, record_rounding, record_is_credit, record_cashier,
  record_mode, record_pay, record_note, record_fix, record_customer_name,
  record_customer_phone, record_sub_total, record_total,
  record_updated_at, record_sync_at
)
SELECT
  record_id, record_paid_at, record_rounding, record_is_credit, record_cashier,
  CASE record_mode
    WHEN 'sell' THEN 'incoming'
    WHEN 'buy'  THEN 'outcoming'
    ELSE record_mode
  END AS record_mode,
  record_pay, record_note, record_fix, record_customer_name,
  record_customer_phone, record_sub_total, record_total,
  record_updated_at, record_sync_at
FROM records_old;

-- 7 record_methods — the old single method paid the whole `record_pay`.
INSERT INTO record_methods (
  record_method_id, record_id, method_id, record_method_pay
)
SELECT
  record_id, record_id, method_id, record_pay
FROM records_old;

-- 8 record_listings — from record_products. One old line is one portion and
--      one group; pre-journal records have no `product_event_id`. `product_id`
--      used to be stored as the listing link; it is now the product snapshot.
INSERT INTO record_listings (
  record_listing_id, record_listing_group_id, record_id, product_event_id,
  product_id, record_listing_name, record_listing_kind, record_listing_unit,
  record_listing_price, record_listing_qty, record_listing_capital,
  record_listing_total
)
SELECT
  rp.record_product_id,
  rp.record_product_id,          -- one old line is its own group
  rp.record_id,
  NULL,                          -- pre-journal lines have no event
  rp.product_id,                 -- may be NULL (old ON DELETE SET NULL)
  rp.record_product_name,
  'retail',
  1,                             -- seed listings are 1-pcs
  rp.record_product_price,
  rp.record_product_qty,
  rp.record_product_capital_raw,
  rp.record_product_total
FROM record_products_old rp;

-- 9 discounts — record_product_id maps 1:1 to record_listing_id. Each migrated
--      discount is its own group (there are no per-portion copies yet).
INSERT INTO discounts (
  discount_id, discount_group_id, record_listing_id, discount_kind,
  discount_value, discount_eff
)
SELECT
  discount_id, discount_id, record_product_id, discount_kind, discount_value, discount_eff
FROM discounts_old;

-- 10 record_extras — 1:1.
INSERT INTO record_extras (
  record_extra_id, record_extra_name, record_id,
  record_extra_value, record_extra_eff, record_extra_kind
)
SELECT
  record_extra_id, record_extra_name, record_id,
  record_extra_value, record_extra_eff, record_extra_kind
FROM record_extras_old;

-- 11 images — 1:1.
INSERT INTO images (
  image_id, image_order, image_name, image_mime, product_id,
  image_updated_at, image_sync_at
)
SELECT
  image_id, image_order, image_name, image_mime, product_id,
  image_updated_at, image_sync_at
FROM images_old;

-- 12 Pending product tombstones -> soft-deleted stub rows.
--
--      !! record tombstones are CORRUPTED and deliberately NOT migrated !! --
--      src/database/record/del-by-id.ts wrote a literal `2` as grave_item_id
--      (a missing `$` in the VALUES template), so all 173 record graves point
--      at the live record '2'. The real ids are unrecoverable. Creating stubs
--      from them would soft-delete a real record, so they are skipped;
--      `graves_old` is retained for inspection. Product graves are valid and
--      are re-materialized as soft-deleted stubs below. The money-kind, `money`
--      and `extra` tombstones were never synced server-side; left alone.
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

-- 13 Force the new aggregates to re-push (the server has never seen
--       stocks/listings/record_methods/record_listings).
--       COMMENTED OUT until the server contract accepts the nested payload —
--       pushing the new shape early will be rejected.
-- UPDATE products SET product_sync_at = NULL;
-- UPDATE records  SET record_sync_at  = NULL;




-- ============================================================================

PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 30;
