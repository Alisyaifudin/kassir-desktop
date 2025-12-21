CREATE TABLE versions (
  v INTEGER PRIMARY KEY
) STRICT;

CREATE TABLE transactions (
  tab INTEGER PRIMARY KEY,
  tx_mode TEXT NOT NULL DEFAULT ('sell') CHECK (tx_mode IN ('buy', 'sell')),
  tx_query TEXT NOT NULL DEFAULT (''),
  tx_fix INTEGER NOT NULL DEFAULT 0,
  tx_method_id INTEGER NOT NULL DEFAULT 1000, -- cash
  tx_note TEXT NOT NULL DEFAULT (''),
  tx_customer_name TEXT NOT NULL DEFAULT (''),
  tx_customer_phone TEXT NOT NULL DEFAULT (''),
  tx_customer_id INTEGER,
  tx_product_barcode TEXT NOT NULL DEFAULT (''),
  tx_product_name TEXT NOT NULL DEFAULT (''),
  tx_product_price REAL NOT NULL DEFAULT 0,
  tx_product_qty INTEGER NOT NULL DEFAULT 0,
  tx_product_stock INTEGER NOT NULL DEFAULT 0,
  tx_extra_name TEXT NOT NULL DEFAULT (''),
  tx_extra_value REAL NOT NULL DEFAULT 0,
  tx_extra_kind TEXT NOT NULL DEFAULT 'percent' CHECK (tx_extra_kind IN ('percent', 'number')),
  tx_extra_is_saved INTEGER NOT NULL DEFAULT 0 CHECK (tx_extra_is_saved IN (0, 1))
) STRICT;

CREATE TABLE extras (
  extra_id TEXT PRIMARY KEY,
  tab INTEGER NOT NULL REFERENCES transactions(tab) ON DELETE CASCADE,
  db_extra_id INTEGER,
  extra_kind TEXT NOT NULL CHECK (extra_kind IN ('percent', 'number')),
  extra_name TEXT NOT NULL,
  extra_value REAL NOT NULL,
  extra_is_saved INTEGER NOT NULL CHECK (extra_is_saved IN (0, 1))
) STRICT;

CREATE TABLE products (
  product_id TEXT PRIMARY KEY,
  tab INTEGER NOT NULL REFERENCES transactions(tab) ON DELETE CASCADE,
  db_product_id INTEGER,
  db_product_price REAL,
  db_product_name TEXT,
  product_name TEXT NOT NULL,
  product_barcode TEXT NOT NULL,
  product_price REAL NOT NULL,
  product_qty INTEGER NOT NULL,
  product_stock INTEGER NOT NULL
) STRICT;

CREATE TABLE discounts (
  disc_id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
  disc_value REAL NOT NULL DEFAULT 0,
  disc_kind TEXT NOT NULL DEFAULT 'percent' CHECK (disc_kind IN ('percent', 'number', 'pcs'))
) STRICT;