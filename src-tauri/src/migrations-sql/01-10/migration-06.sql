-- 1. First, rename the original column (keeps data)
ALTER TABLE records RENAME COLUMN disc_val TO disc_val_old;
ALTER TABLE record_items RENAME COLUMN disc_val TO disc_val_old;