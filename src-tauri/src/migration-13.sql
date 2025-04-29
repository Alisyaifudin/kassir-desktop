ALTER TABLE products RENAME TO products_old;

CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  stock INTEGER NOT NULL,
  price INTEGER NOT NULL,
  barcode TEXT UNIQUE,
  capital INTEGER NOT NULL DEFAULT 0
) STRICT;

INSERT INTO products
SELECT 
  id,
  name,
  stock,
  price,
  barcode,
  CASE WHEN capital IS NULL THEN 0 ELSE capital END AS capital
FROM products_old;

DROP TABLE products_old;

CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);

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
  capital INTEGER NOT NULL DEFAULT 0
) STRICT;

INSERT INTO record_items
SELECT 
  id,
  timestamp,
  name,
  price,
  qty,
  subtotal,
  disc_val,
  disc_type,
  CASE WHEN capital IS NULL THEN 0 ELSE capital END AS capital
FROM record_items_old;

DROP TABLE record_items_old;