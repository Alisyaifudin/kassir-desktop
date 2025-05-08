PRAGMA foreign_keys = OFF;

ALTER TABLE additionals RENAME TO additionals_old;
ALTER TABLE record_items RENAME TO record_items_old;
ALTER TABLE discounts RENAME TO discounts_old;

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

INSERT INTO additionals 
SELECT * FROM additionals_old;

INSERT INTO record_items 
SELECT * FROM record_items_old;

INSERT INTO discounts 
SELECT * FROM discounts;

-- Drop old tables
DROP TABLE additionals_old;
DROP TABLE discounts_old;
DROP TABLE record_items_old;

PRAGMA foreign_keys = ON;