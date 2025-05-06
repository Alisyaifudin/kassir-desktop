ALTER TABLE records
RENAME total TO grand_total;

ALTER TABLE records
ADD total INTEGER NOT NULL DEFAULT 0;