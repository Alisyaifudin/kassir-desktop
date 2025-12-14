PRAGMA foreign_keys = OFF;

ALTER TABLE discounts RENAME TO discounts_old;
ALTER TABLE additionals RENAME TO additionals_old;
ALTER TABLE record_items RENAME TO record_items_old;
ALTER TABLE records RENAME TO records_old;

CREATE TABLE methods (
  name TEXT PRIMARY KEY
) STRICT;

INSERT INTO methods 
VALUES ('cash'), ('transfer'), ('debit'), ('qris'), ('other');

CREATE TABLE method_types (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  method TEXT NOT NULL REFERENCES methods(name) ON DELETE CASCADE ON UPDATE CASCADE
) STRICT;

CREATE TABLE records (
  timestamp INTEGER PRIMARY KEY,
  total_before_disc REAL NOT NULL,
  disc_val REAL NOT NULL DEFAULT 0.0,
  disc_type TEXT NOT NULL CHECK (disc_type IN ('number', 'percent')) DEFAULT 'percent',
  total_after_disc REAL NOT NULL,
  total_tax REAL NOT NULL,
  total_after_tax REAL NOT NULL,
  rounding REAL,
  grand_total REAL NOT NULL,
  credit INTEGER CHECK (credit IN (0, 1)) DEFAULT 0,
  cashier TEXT,
  mode TEXT NOT NULL CHECK (mode IN ('sell', 'buy')),
  pay REAL NOT NULL,
  change REAL NOT NULL,
  method TEXT NOT NULL REFERENCES methods(name) DEFAULT 'cash',
  method_type INTEGER REFERENCES method_types(id) ON DELETE SET NULL ON UPDATE CASCADE,
  note TEXT NOT NULL DEFAULT ''
) STRICT;

CREATE TABLE additionals (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  timestamp INTEGER NOT NULL REFERENCES records(timestamp) ON DELETE CASCADE ON UPDATE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('number', 'percent')) DEFAULT 'percent',
  value REAL NOT NULL
) STRICT;

CREATE TABLE record_items (
  id INTEGER PRIMARY KEY,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  timestamp INTEGER NOT NULL REFERENCES records(timestamp) ON DELETE CASCADE ON UPDATE CASCADE,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  qty INTEGER NOT NULL,
  total_before_disc REAL NOT NULL,
  total REAL NOT NULL,
  capital REAL NOT NULL DEFAULT 0
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
  method,
  null AS method_type,
  note
FROM records_old;

INSERT INTO additionals 
SELECT * FROM additionals_old;

INSERT INTO record_items 
SELECT * FROM record_items_old;

INSERT INTO discounts 
SELECT * FROM discounts;

-- Drop old tables
DROP TABLE discounts_old;
DROP TABLE additionals_old;
DROP TABLE record_items_old;
DROP TABLE records_old;

PRAGMA foreign_keys = ON;