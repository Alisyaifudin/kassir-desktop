-- Bit 0 used to mark the open draft; it now marks a stored (pending) cart.
-- Clear the legacy meaning so old drafts do not load as parked carts; the
-- active tab now comes from the URL or the first open draft.
UPDATE tx_records SET tx_record_flag = tx_record_flag & ~1;
