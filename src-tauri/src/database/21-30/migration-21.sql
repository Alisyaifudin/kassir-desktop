PRAGMA foreign_keys = OFF;

ALTER TABLE additionals RENAME TO additionals_old;
ALTER TABLE records RENAME TO records_old;
ALTER TABLE record_items RENAME TO record_items_old;
ALTER TABLE discounts RENAME TO discounts_old;

CREATE TABLE records (
  timestamp INTEGER PRIMARY KEY,
  total_before_disc INTEGER NOT NULL,
  disc_val REAL NOT NULL DEFAULT 0.0,
  disc_type TEXT NOT NULL CHECK (disc_type IN ('number', 'percent')) DEFAULT 'percent',
  total_after_disc INTEGER NOT NULL,
  total_tax INTEGER NOT NULL,
  total_after_tax INTEGER NOT NULL,
  rounding INTEGER,
  grand_total INTEGER NOT NULL,
  credit INTEGER CHECK (credit IN (0, 1)) DEFAULT 0,
  cashier TEXT,
  mode TEXT NOT NULL CHECK (mode IN ('sell', 'buy')),
  pay INTEGER NOT NULL,
  change INTEGER NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('cash', 'transfer', 'other')) DEFAULT 'cash',
  note TEXT NOT NULL DEFAULT ''
) STRICT;

CREATE TABLE additionals (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  timestamp INTEGER NOT NULL REFERENCES records(timestamp) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('number', 'percent')) DEFAULT 'percent',
  value REAL NOT NULL
) STRICT;

CREATE TABLE record_items (
  id INTEGER PRIMARY KEY,
  timestamp INTEGER NOT NULL REFERENCES records(timestamp) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  qty INTEGER NOT NULL,
  total_before_disc INTEGER NOT NULL,
  total INTEGER NOT NULL,
  capital INTEGER NOT NULL DEFAULT 0
) STRICT;

CREATE TABLE discounts (
  id INTEGER PRIMARY KEY,
  record_item_id INTEGER NOT NULL REFERENCES record_items(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('percent', 'number')) DEFAULT 'percent',
  value REAL NOT NULL
) STRICT;

INSERT INTO records 
SELECT 
  timestamp,
  total_before_disc,
  disc_val,
  disc_type,
  total_after_disc,
  total_tax,
  total_after_tax,
  rounding,
  grand_total,
  credit,
  cashier,
  mode,
  pay,
  change,
  CASE WHEN method = 'emoney' THEN 'other' ELSE method END AS method,
  note
FROM records_old;

INSERT INTO additionals 
SELECT  
  id,
  name,
  timestamp,
  kind,
  CAST(value AS REAL) AS value
FROM additionals_old;

INSERT INTO record_items 
SELECT  
  id,
  timestamp,
  name,
  price,
  qty,
  total_before_disc,
  total,
  capital
FROM record_items_old;

INSERT INTO discounts 
SELECT 
  id,
  record_item_id,
  kind,
  value
FROM discounts;

-- Drop old tables
DROP TABLE discounts_old;
DROP TABLE additionals_old;
DROP TABLE record_items_old;
DROP TABLE records_old;

PRAGMA foreign_keys = ON;