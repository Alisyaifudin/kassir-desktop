PRAGMA foreign_keys = OFF;
PRAGMA busy_timeout = 30000;

ALTER TABLE discounts RENAME TO discounts_old;
ALTER TABLE images RENAME TO images_old;
ALTER TABLE additionals RENAME TO additionals_old;
ALTER TABLE record_items RENAME TO record_items_old;
ALTER TABLE records RENAME TO records_old;
ALTER TABLE products RENAME TO products_old;
ALTER TABLE method_types RENAME TO method_types_old;
ALTER TABLE methods RENAME TO methods_old;

CREATE TABLE value_kind_enum(
  v TEXT PRIMARY KEY
) STRICT;

INSERT INTO value_kind_enum VALUES ('number'), ('percent');

CREATE TABLE mode_enum(
  v TEXT PRIMARY KEY
) STRICT;

INSERT INTO mode_enum VALUES ('sell'), ('buy');

CREATE TABLE method_enum(
  v TEXT PRIMARY KEY
) STRICT;

INSERT INTO method_enum VALUES ('cash'), ('transfer'), ('debit'), ('qris');

CREATE TABLE methods(
  id INTEGER PRIMARY KEY,
  name TEXT,
  method TEXT NOT NULL REFERENCES method_enum(v)
) STRICT;

INSERT INTO methods (id, method) VALUES (1000, 'cash'), (1001, 'transfer'), (1002, 'debit'), (1003, 'qris');

INSERT INTO methods (id, name, method) 
SELECT 
  id, 
  name,
  CASE WHEN method = 'other' THEN 'transfer' ELSE method END AS method
FROM method_types_old;

-- /////////////////////////////////////////////////////////////////////
CREATE TABLE products(
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  stock INTEGER NOT NULL,
  stock_back INTEGER NOT NULL,
  barcode TEXT UNIQUE,
  capital REAL NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
) STRICT;

INSERT INTO products (id, name, price, stock, stock_back, barcode, capital, note)
SELECT 
  id, name, price, stock, 0 AS stock_back, barcode, capital, 
  CASE WHEN note IS NULL THEN '' ELSE note END AS note
FROM products_old;
-- /////////////////////////////////////////////////////////////////////

-- /////////////////////////////////////////////////////////////////////
CREATE TABLE images (
    id         INTEGER PRIMARY KEY,
    name       TEXT    NOT NULL,
    mime       TEXT    NOT NULL,
    product_id INTEGER REFERENCES products (id) ON DELETE CASCADE
) STRICT;

INSERT INTO images SELECT * FROM images_old;

-- /////////////////////////////////////////////////////////////////////


-- /////////////////////////////////////////////////////////////////////
CREATE TABLE records(
  timestamp INTEGER PRIMARY KEY,
  paid_at INTEGER NOT NULL,
  disc_val REAL NOT NULL,
  disc_kind TEXT NOT NULL REFERENCES value_kind_enum(v) DEFAULT 'percent',
  rounding REAL NOT NULL DEFAULT 0,
  credit INTEGER NOT NULL CHECK (credit IN (0, 1)) DEFAULT 0,
  cashier TEXT NOT NULL,
  mode TEXT NOT NULL REFERENCES mode_enum(v),
  pay REAL NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  method_id INTEGER NOT NULL REFERENCES methods(id)
) STRICT;

INSERT INTO records (
  timestamp, 
  paid_at, 
  disc_val, 
  disc_kind, 
  rounding,
  credit,
  cashier,
  mode, 
  pay,
  note,
  method_id
) SELECT 
  timestamp,
  timestamp AS paid_at,
  disc_val,
  disc_type as disc_kind,
  CASE WHEN rounding IS NULL THEN 0 ELSE rounding END AS rounding,
  credit,
  CASE WHEN cashier IS NULL THEN 'admin' ELSE cashier END AS cashier,
  mode, 
  pay,
  note,
  CASE 
    -- Rule 1: if method = 'other', return 1001
    WHEN method = 'other' THEN 1001

    -- Rule 2: if method_type is null, map based on method value
    WHEN method_type IS NULL THEN
      CASE 
        WHEN method = 'cash' THEN 1000
        WHEN method = 'transfer' THEN 1001
        WHEN method = 'debit' THEN 1002
        WHEN method = 'qris' THEN 1003
        ELSE 1001
      END
    
    -- Rule 3: else, return method_type from old table
    ELSE method_type
  END AS method_id
FROM records_old;
-- /////////////////////////////////////////////////////////////////////

-- /////////////////////////////////////////////////////////////////////
CREATE TABLE record_items(
  id INTEGER PRIMARY KEY,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  timestamp INTEGER NOT NULL REFERENCES records(timestamp) ON DELETE CASCADE ON UPDATE CASCADE,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  qty INTEGER NOT NULL,
  capital REAL NOT NULL
) STRICT;

INSERT INTO record_items (id, product_id, timestamp, name, price, qty, capital)
SELECT id, product_id, timestamp, name, price, qty, capital
FROM record_items_old;
-- /////////////////////////////////////////////////////////////////////

-- /////////////////////////////////////////////////////////////////////
CREATE TABLE additionals(
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  timestamp INTEGER NOT NULL REFERENCES records (timestamp) ON DELETE CASCADE ON UPDATE CASCADE,
  kind TEXT NOT NULL REFERENCES value_kind_enum(v) DEFAULT 'percent',
  value REAL NOT NULL
) STRICT;

INSERT INTO additionals (id, name, timestamp, kind, value)
SELECT id, name, timestamp, kind, value
FROM additionals_old;
-- /////////////////////////////////////////////////////////////////////

-- /////////////////////////////////////////////////////////////////////
CREATE TABLE discounts(
  id INTEGER PRIMARY KEY,
  record_item_id INTEGER NOT NULL REFERENCES record_items(id) ON DELETE CASCADE,
  kind TEXT NOT NULL REFERENCES value_kind_enum(v) DEFAULT 'percent',
  value REAL NOT NULL
) STRICT;

INSERT INTO discounts (id, record_item_id, kind, value)
SELECT 
  id, 
  record_item_id, 
  CASE 
    WHEN kind = 'percent' THEN 'percent'
    WHEN kind = 'number' THEN 'number'
    ELSE 'percent'
  END AS kind,
  value
FROM discounts_old;

-- Drop old tables
DROP TABLE discounts_old;
DROP TABLE additionals_old;
DROP TABLE record_items_old;
DROP TABLE records_old;
DROP TABLE images_old;
DROP TABLE products_old;
DROP TABLE method_types_old;
DROP TABLE methods_old;


PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 30;