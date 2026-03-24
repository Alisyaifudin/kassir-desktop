ALTER TABLE extras RENAME TO extras_old;
ALTER TABLE discounts RENAME TO discounts_old;
ALTER TABLE products RENAME TO products_old;
ALTER TABLE transactions RENAME TO transactions_old;

CREATE TABLE transactions (
  tab                 INTEGER PRIMARY KEY,
  tx_mode             TEXT NOT NULL DEFAULT ('sell') CHECK (tx_mode IN ('buy', 'sell')),
  tx_query            TEXT NOT NULL DEFAULT (''),
  tx_fix              INTEGER NOT NULL DEFAULT 0,
  tx_method_id        TEXT NOT NULL DEFAULT ('1000'), -- cash
  tx_note             TEXT NOT NULL DEFAULT (''),
  tx_customer_name    TEXT NOT NULL DEFAULT (''),
  tx_customer_phone   TEXT NOT NULL DEFAULT (''),
  tx_customer_id      TEXT, -- change from INTEGER TO TEXT
  tx_product_barcode  TEXT NOT NULL DEFAULT (''),
  tx_product_name     TEXT NOT NULL DEFAULT (''),
  tx_product_price    REAL NOT NULL DEFAULT 0,
  tx_product_qty      INTEGER NOT NULL DEFAULT 0,
  tx_extra_name       TEXT NOT NULL DEFAULT (''),
  tx_extra_value      REAL NOT NULL DEFAULT 0,
  tx_extra_kind       TEXT NOT NULL DEFAULT 'percent' CHECK (tx_extra_kind IN ('percent', 'number'))
) STRICT;

INSERT INTO transactions (
  tab,
  tx_mode,
  tx_query,
  tx_fix,
  tx_method_id,
  tx_note,
  tx_customer_name,
  tx_customer_phone,
  tx_customer_id,
  tx_product_barcode,
  tx_product_name,
  tx_product_price,
  tx_product_qty,
  tx_extra_name,
  tx_extra_value,
  tx_extra_kind
)
SELECT
  tab,
  tx_mode,
  tx_query,
  tx_fix,
  CAST(tx_method_id AS TEXT),
  tx_note,
  tx_customer_name,
  tx_customer_phone,
  CAST(tx_customer_id AS TEXT),
  tx_product_barcode,
  tx_product_name,
  tx_product_price,
  tx_product_qty,
  tx_extra_name,
  tx_extra_value,
  tx_extra_kind
FROM transactions_old;


CREATE TABLE products (
  product_order       INTEGER PRIMARY KEY,
  product_id          TEXT NOT NULL UNIQUE,
  tab                 INTEGER NOT NULL REFERENCES transactions(tab) ON DELETE CASCADE,
  db_product_id       TEXT, -- change to text
  db_product_price    REAL,
  db_product_capital  REAL,
  db_product_stock    INTEGER,
  db_product_name     TEXT,
  product_name        TEXT NOT NULL,
  product_barcode     TEXT NOT NULL,
  product_price       REAL NOT NULL,
  product_qty         INTEGER NOT NULL
) STRICT;

INSERT INTO products (
  product_id, tab, db_product_id, db_product_price, db_product_capital, db_product_stock, db_product_name,
  product_name, product_barcode, product_price, product_qty
)
SELECT 
  product_id, tab, CAST(db_product_id AS TEXT), db_product_price, 0.0, 0, db_product_name,
  product_name, product_barcode, product_price, product_qty 
FROM products_old;

CREATE TABLE discounts (
  disc_order    INTEGER PRIMARY KEY, 
  disc_id       TEXT NOT NULL UNIQUE,
  product_id    TEXT NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
  disc_value    REAL NOT NULL DEFAULT 0,
  disc_kind     TEXT NOT NULL DEFAULT 'percent' CHECK (disc_kind IN ('percent', 'number', 'pcs'))
) STRICT;

INSERT INTO discounts (disc_order, disc_id, product_id, disc_value, disc_kind)
SELECT disc_order, disc_id, product_id, disc_value, disc_kind
FROM discounts_old;

CREATE TABLE extras (
  extra_order     INTEGER PRIMARY KEY,
  extra_id        TEXT NOT NULL UNIQUE,
  tab             INTEGER NOT NULL REFERENCES transactions(tab) ON DELETE CASCADE,
  db_extra_id     TEXT,
  extra_kind      TEXT NOT NULL CHECK (extra_kind IN ('percent', 'number')),
  extra_name      TEXT NOT NULL,
  extra_value     REAL NOT NULL,
) STRICT;

INSERT INTO extras (
  extra_id, tab, db_extra_id, extra_kind, extra_name, extra_value, extra_is_saved
)
SELECT 
  extra_id, tab, CAST(db_extra_id AS TEXT), extra_kind, extra_name, extra_value, extra_is_saved
FROM extras_old;

-- Create indexes for better query performance
CREATE INDEX idx_extras_extra_id ON extras(extra_id);
CREATE INDEX idx_products_product_id ON products(product_id);
CREATE INDEX idx_discounts_disc_id ON discounts(disc_id);

DROP TABLE transactions_old;
DROP TABLE discounts_old;
DROP TABLE products_old;
DROP TABLE extras_old;