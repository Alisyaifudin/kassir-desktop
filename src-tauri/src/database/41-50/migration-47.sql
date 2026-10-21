-- ============================================================================
-- migration-47   Reconcile the stock journal with the cached lot value.
-- ============================================================================
-- migration-44 seeds one lot per product from the old `product_stock` and
-- repoints the old `product_events` at it. The lot is what the app reads as
-- stock; the events are the append-only journal. They agree only when every
-- movement was logged, which the old data predates: the opening stock lived in
-- `product_stock`, not in an event.
--
-- For each lot, compare the cached `stock_value` with the sum of its events and
-- journal the difference as one final, signed adjustment. The lot is left as it
-- is -- it is the figure the shop counted -- so the journal is what gets
-- corrected. A second run would find no difference and insert nothing.
--
-- The id is a random 128-bit hex rather than the app's ULID (SQL cannot mint
-- one); ids are opaque text everywhere, so that is fine.
-- ============================================================================

-- Read the gaps into a table first: SQLite does not guarantee the order while
-- inserting into a table a SELECT is already reading, and a later lot's gap
-- must not be computed from an earlier lot's adjustment.
CREATE TEMP TABLE _stock_reconcile AS
SELECT
  s.stock_id,
  s.product_id,
  s.stock_value,
  s.stock_capital,
  s.stock_value - COALESCE(SUM(e.product_event_value), 0) AS gap,
  COALESCE(MAX(e.product_event_created_at), 0) AS last_event_at
FROM stocks s
JOIN products p ON p.product_id = s.product_id
LEFT JOIN product_events e ON e.stock_id = s.stock_id
WHERE p.product_deleted_at IS NULL
GROUP BY s.stock_id
HAVING s.stock_value - COALESCE(SUM(e.product_event_value), 0) <> 0;

INSERT INTO product_events (
  product_event_id,
  product_event_created_at,
  product_event_sync_at,
  product_event_value,
  product_event_capital,
  product_event_note,
  product_id,
  stock_id,
  record_id
)
SELECT
  lower(hex(randomblob(16))),
  -- the final event: never before the lot's last one, even with clock skew
  MAX(CAST(strftime('%s', 'now') AS INTEGER) * 1000, last_event_at + 1),
  NULL,                       -- a new local event, like every other movement
  gap,
  stock_capital,
  'Kalkulasi ulang',
  product_id,
  stock_id,
  NULL                        -- no record produced it
FROM _stock_reconcile;

DROP TABLE _stock_reconcile;
