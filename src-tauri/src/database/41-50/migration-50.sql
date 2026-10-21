-- ============================================================================
-- migration-50   Columns and index for committing a live cart.
-- ============================================================================
-- `tx_records` keeps the pending new-customer text, so closing the options
-- dialog no longer loses a typed name before submit.
ALTER TABLE tx_records ADD COLUMN tx_record_customer_name TEXT NOT NULL DEFAULT '';
ALTER TABLE tx_records ADD COLUMN tx_record_customer_phone TEXT NOT NULL DEFAULT '';

-- A code always has a kind; the old product-level barcode had none. Drop the
-- old unique index first so the backfill cannot trip it.
DROP INDEX IF EXISTS listing_barcode_unique;
UPDATE listings SET listing_code_kind = 'barcode'
WHERE listing_code IS NOT NULL AND listing_code_kind IS NULL;

-- Only a *live* barcode is unique: a soft-deleted listing's code may be reused.
CREATE UNIQUE INDEX listing_barcode_unique ON listings (listing_code)
  WHERE listing_code_kind = 'barcode' AND listing_deleted_at IS NULL;
