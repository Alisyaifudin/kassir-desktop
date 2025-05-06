PRAGMA foreign_keys = OFF;

ALTER TABLE records RENAME COLUMN disc_val_old TO disc_val;
ALTER TABLE record_items RENAME COLUMN disc_val_old TO disc_val;

ALTER TABLE records RENAME TO records_old;
CREATE TABLE records (
  timestamp INTEGER PRIMARY KEY,
  total INTEGER NOT NULL,
  grand_total INTEGER NOT NULL,
  pay INTEGER NOT NULL,
  disc_val REAL NOT NULL,
  disc_type TEXT NOT NULL CHECK (disc_type IN ('number', 'percent')),
  change INTEGER NOT NULL,
  mode TEXT CHECK (mode IN ('sell', 'buy'))
) STRICT;

INSERT INTO records
SELECT  
    timestamp,
    total,
    grand_total,
    pay,
    CAST(disc_val AS REAL),
    disc_type,
    change,
    mode
FROM records_old;

DROP TABLE records_old;

ALTER TABLE record_items RENAME TO record_items_old;
CREATE TABLE record_items (
  id INTEGER PRIMARY KEY,
  timestamp INTEGER NOT NULL REFERENCES records(timestamp) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  qty INTEGER NOT NULL,
  subtotal INTEGER NOT NULL,
  disc_val REAL NOT NULL,
  disc_type TEXT NOT NULL CHECK (disc_type IN ('number', 'percent')),
  capital INTEGER
) STRICT;

INSERT INTO record_items
SELECT 
    id,
    timestamp,
    name,
    price,
    qty,
    subtotal,
    CAST(disc_val AS REAL),
    disc_type,
    capital
FROM record_items_old;

DROP TABLE record_items_old;

PRAGMA foreign_keys = ON;
PRAGMA foreign_key_check;  -- Verify no FK violations were introduced