PRAGMA foreign_keys = OFF;

CREATE TABLE records_new (
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
  cashier TEXT REFERENCES cashiers(name) ON DELETE SET NULL,
  mode TEXT NOT NULL CHECK (mode IN ('sell', 'buy')),
  pay INTEGER NOT NULL,
  change INTEGER NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  method TEXT NOT NULL CHECK (method IN ('cash', 'transfer', 'emoney')) DEFAULT 'cash'
) STRICT;

CREATE TABLE taxes_new (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  timestamp INTEGER NOT NULL REFERENCES records_new(timestamp) ON DELETE CASCADE,
  percent REAL NOT NULL,
  value INTEGER NOT NULL
) STRICT;

CREATE TABLE record_items_new (
  id INTEGER PRIMARY KEY,
  timestamp INTEGER NOT NULL REFERENCES records_new(timestamp) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  qty INTEGER NOT NULL,
  total_before_disc INTEGER NOT NULL,
  total INTEGER NOT NULL,
  disc_val REAL NOT NULL DEFAULT 0.0,
  disc_type TEXT NOT NULL CHECK (disc_type IN ('number', 'percent')) DEFAULT 'percent',
  capital INTEGER NOT NULL DEFAULT 0
) STRICT;

INSERT INTO records_new
SELECT 
  timestamp,
  total AS total_before_disc,
  disc_val,
  disc_type,
  total AS total_after_disc,
  0,
  total AS total_after_tax,
  rounding,
  grand_total,
  credit,
  cashier,
  mode,
  pay,
  change,
  '' AS note,
  'cash' AS method
FROM records;

INSERT INTO taxes_new SELECT * FROM taxes;
INSERT INTO record_items_new
SELECT 
  id,
  timestamp,
  name,
  price,
  qty,
  subtotal AS total_before_disc,
  subtotal AS total,
  disc_val,
  disc_type,
  capital
FROM record_items;

-- Drop old tables
DROP TABLE taxes;
DROP TABLE record_items;
DROP TABLE records;

-- Rename new tables
ALTER TABLE taxes_new RENAME TO taxes;
ALTER TABLE records_new RENAME TO records;
ALTER TABLE record_items_new RENAME TO record_items;
