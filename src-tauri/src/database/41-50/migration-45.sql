-- ============================================================================
-- migration-45   Link `product_events` to the record that produced them
-- ============================================================================
-- Deleting a record has to remove the stock movement it caused. `product_events`
-- carried no back-reference to `records` (see migration-43 §7 for its column
-- set: it is valued on `product_id` / `stock_id` only), so there was nothing to
-- key that delete on.
--
-- The column is nullable by design:
--   * manual corrections (`stock.adjust` / `stock.consume` from the UI) belong
--     to no record and stay NULL;
--   * records committed before this migration have no link, so deleting one of
--     those finds no events to remove and leaves stock as it stands.
-- Only the commit path (`record.add.one`) stamps it.
--
-- KNOWN DEVIATION from migration-43's sync contract, which declares
-- `product_event` append-only ("Events are not deleted") because the push/pull
-- cursor can only express `product_event_created_at` / `product_event_sync_at`.
-- `record.delete.byId` deletes rows regardless, so a deleted record's stock
-- effect can survive on a peer until it re-pulls the affected product.
--
-- SQLite permits ADD COLUMN with a REFERENCES clause as long as the default is
-- NULL, so this needs no table rebuild.
-- ============================================================================

ALTER TABLE product_events
  ADD COLUMN record_id TEXT REFERENCES records(record_id) ON DELETE SET NULL;

CREATE INDEX product_event_record_idx ON product_events (record_id);
