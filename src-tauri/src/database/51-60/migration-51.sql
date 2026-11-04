-- The stock fold's index (SYNC-V2 §8.7).
--
-- `stocks` is a projection of the append-only `product_events` journal, and the
-- fold re-derives a lot from it inside the same transaction as the page that
-- carried its events (see `rebuildStockStatements` in the sync service):
--
--   * `SUM(product_event_value)` for the lot;
--   * the newest event that carries a capital, `ORDER BY created_at DESC, id DESC`;
--   * `MIN`/`MAX(product_event_created_at)` for the lot;
--   * a `NOT EXISTS` anti-join asking whether any newer event of the same lot exists.
--
-- Every one of those is "this lot, in time order", and `product_event_stock_idx`
-- alone only answers "this lot": the anti-join then scans the whole lot for each
-- candidate row, so the fold went quadratic in the size of a lot. On a shop-sized
-- journal (178k events, lots of several hundred) that is 1.5–5.8 s per 200-product
-- chunk — measured on a real database, and 4x faster with this index in place.
CREATE INDEX product_event_stock_time_idx
  ON product_events (stock_id, product_event_created_at, product_event_id);
