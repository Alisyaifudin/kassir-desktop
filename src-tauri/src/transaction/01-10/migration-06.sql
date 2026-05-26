ALTER TABLE discounts RENAME TO discounts_old;
ALTER TABLE products RENAME TO products_old;

CREATE TABLE products (
  product_id          TEXT PRIMARY KEY,
  tab                 INTEGER NOT NULL REFERENCES transactions(tab) ON DELETE CASCADE,
  db_product_id       TEXT, 
  db_product_price    REAL,
  db_product_capital  REAL,
  db_product_stock    INTEGER,
  db_product_name     TEXT,
  product_name        TEXT NOT NULL,
  product_barcode     TEXT NOT NULL,
  product_price       REAL NOT NULL,
  product_qty         INTEGER NOT NULL,
  product_created_at  INTEGER NOT NULL
) STRICT;

INSERT INTO products (
  product_id, tab, db_product_id, db_product_price, db_product_capital, db_product_stock, db_product_name,
  product_name, product_barcode, product_price, product_qty, product_created_at
)
SELECT 
  product_id, tab, CAST(db_product_id AS TEXT), db_product_price, 0.0, 0, db_product_name,
  product_name, product_barcode, product_price, product_qty, CAST(unixepoch('subsec') * 1000 AS INTERGER)
FROM products_old
ORDER BY product_order;

CREATE TABLE discount_kind_enum (
  v TEXT PRIMARY KEY
) STRICT;

INSERT INTO discount_kind_enum (v) VALUES ('percent'), ('number'), ('pcs');

CREATE TABLE discounts (
  disc_order    INTEGER PRIMARY KEY, 
  disc_id       TEXT NOT NULL UNIQUE,
  product_id    TEXT NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
  disc_value    REAL NOT NULL DEFAULT 0,
  disc_kind     TEXT NOT NULL DEFAULT 'percent' REFERENCES discount_kind_enum(v)
) STRICT;

INSERT INTO discounts (disc_order, disc_id, product_id, disc_value, disc_kind)
SELECT disc_order, disc_id, product_id, disc_value, disc_kind
FROM discounts_old;

DROP TABLE discounts_old;
DROP TABLE products_old;