DROP TABLE products;

CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  stock INTEGER NOT NULL,
  price INTEGER NOT NULL,
  barcode TEXT UNIQUE,
  capital INTEGER
) STRICT;

INSERT INTO products
SELECT 
  id,
  name,
  stock,
  price,
  CASE WHEN barcode IS NULL THEN NULL ELSE CAST(barcode AS TEXT) END AS barcode,
  capital
FROM products_old;

DROP TABLE products_old;

CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);