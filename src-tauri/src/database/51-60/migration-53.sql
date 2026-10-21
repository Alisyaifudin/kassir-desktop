-- ----------------------------------------------------------------------------
-- Index the stock journal the way the history screen reads it.
--
-- The product detail → Riwayat pager is a keyset read:
--
--   WHERE product_id = $1
--     AND (created_at < $2 OR (created_at = $2 AND id < $3))
--   ORDER BY product_event_created_at DESC, product_event_id DESC
--   LIMIT $4
--
-- `product_events` was only indexed on `product_id` (migration-43, repeated in
-- migration-51), so every page scanned that product's whole journal and sorted
-- it in a temp B-tree. Keep the exact sort order in the index so the read is a
-- range scan plus a LIMIT.
--
-- Append-only: migrations 01-52 are byte-fingerprinted by
-- `src/services/db/migration-chain.test.ts`, so the fix arrives as a new version.
-- ----------------------------------------------------------------------------

CREATE INDEX product_event_product_time_idx
  ON product_events (product_id, product_event_created_at DESC, product_event_id DESC);
