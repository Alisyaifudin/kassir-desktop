-- ============================================================================
-- migration-45   Reserved bridge between the branch histories.
-- ============================================================================
-- `prod` applied the webp change as migration 46 before this branch renumbered
-- its own files, so the resolved list has no 45 while some databases carry 46.
-- sqlx only cares that every recorded version exists, but keeping the slot lets
-- the sequence read straight through. It changes nothing.
UPDATE tx_records SET tx_record_flag = tx_record_flag WHERE 0;
