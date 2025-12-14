CREATE TABLE versions (
  v INTEGER PRIMARY KEY
) STRICT;

CREATE TABLE img_mimes (
  v TEXT PRIMARY KEY
) STRICT;

INSERT INTO img_mimes VALUES ('image/png'), ('image/jpeg');

CREATE TABLE money_enum (
  v TEXT PRIMARY KEY
) STRICT;

INSERT INTO money_enum VALUES ('saving'), ('debt'), ('diff');

-----------------------------------------------------
ALTER TABLE cashiers RENAME TO cashiers_old;
ALTER TABLE socials RENAME TO socials_old;
ALTER TABLE money RENAME TO money_old;
ALTER TABLE customers RENAME TO customers_old;

-----------------------------------------------------
CREATE TABLE cashiers (
  cashier_name TEXT PRIMARY KEY,
  cashier_role TEXT NOT NULL REFERENCES role_enum(v),
  cashier_hash TEXT NOT NULL
) STRICT;

INSERT INTO cashiers (
  cashier_name, 
  cashier_role, 
  cashier_hash
)
SELECT name, role, hash FROM cashiers_old;

-----------------------------------------------------
CREATE TABLE socials (
  social_id INTEGER PRIMARY KEY,
  social_name TEXT NOT NULL,
  social_value TEXT NOT NULL
) STRICT;

INSERT INTO socials(
  social_id, 
  social_name, 
  social_value 
)
SELECT id, name, value FROM socials_old;

-----------------------------------------------------
CREATE TABLE money (
  timestamp INTEGER PRIMARY KEY,
  money_value REAL NOT NULL,
  money_kind TEXT NOT NULL REFERENCES money_enum(v)
) STRICT;

INSERT INTO money (
  timestamp, 
  money_value, 
  money_kind
)
SELECT timestamp, value, kind FROM money_old;

-----------------------------------------------------
CREATE TABLE customers (
  customer_name TEXT PRIMARY KEY,
  customer_phone TEXT NOT NULL
) STRICT;

INSERT INTO customers (customer_name, customer_phone)
SELECT name, phone FROM customers_old;

-----------------------------------------------------
ALTER TABLE additionals RENAME TO record_extras_old;
ALTER TABLE discounts RENAME TO discounts_old;
ALTER TABLE record_items RENAME TO record_products_old;
ALTER TABLE records RENAME TO records_old;
ALTER TABLE methods RENAME TO methods_old;
ALTER TABLE additional_items RENAME TO extras_old;
ALTER TABLE images RENAME TO images_old;
ALTER TABLE products RENAME TO products_old;

-----------------------------------------------------
CREATE TABLE products (
  product_id INTEGER PRIMARY KEY,
  product_barcode TEXT UNIQUE,
  product_name TEXT NOT NULL,
  product_price REAL NOT NULL,
  product_stock INTEGER NOT NULL,
  product_capital REAL NOT NULL,
  product_note TEXT NOT NULL
) STRICT;

INSERT INTO products (
  product_id, product_barcode, product_name, product_price, product_stock, product_capital, product_note
)
SELECT 
  id, barcode, name, price, stock, capital, note
FROM products_old;

-----------------------------------------------------
CREATE TABLE images (
  img_id INTEGER PRIMARY KEY,
  img_name TEXT NOT NULL,
  img_mime TEXT NOT NULL REFERENCES img_mimes(v),
  product_id INTEGER NOT NULL REFERENCES products(product_id)
) STRICT;

INSERT INTO images (
  img_id, 
  img_name, 
  img_mime, 
  product_id 
)
SELECT 
  id, name, mime, product_id
FROM images_old;

-----------------------------------------------------
CREATE TABLE extras (
  extra_id INTEGER PRIMARY KEY,
  extra_name TEXT NOT NULL,
  extra_value REAL NOT NULL,
  extra_kind TEXT NOT NULL CHECK (extra_kind IN ('number', 'percent'))
) STRICT;

INSERT INTO extras (
  extra_id, 
  extra_name, 
  extra_value, 
  extra_kind
)
SELECT id, name, value, kind FROM extras_old;

-----------------------------------------------------
CREATE TABLE methods (
  method_id INTEGER PRIMARY KEY,
  method_name TEXT,
  method_kind TEXT NOT NULL REFERENCES method_enum(v),
  method_deleted_at INTEGER
) STRICT;

INSERT INTO methods (method_id, method_name, method_kind)
SELECT id, name, method
FROM methods_old;

-----------------------------------------------------
CREATE TABLE records (
  timestamp INTEGER PRIMARY KEY,
  record_paid_at INTEGER NOT NULL,
  record_rounding REAL NOT NULL,
  record_is_credit INTEGER NOT NULL CHECK (record_is_credit IN (0, 1)),
  record_cashier TEXT NOT NULL,
  record_mode TEXT NOT NULL REFERENCES mode_enum(v),
  record_pay REAL NOT NULL,
  record_note TEXT NOT NULL,
  method_id INTEGER NOT NULL REFERENCES methods(method_id),
  record_fix INTEGER NOT NULL,
  record_customer_name TEXT NOT NULL,
  record_customer_phone TEXT NOT NULL,
  record_sub_total REAL NOT NULL,
  record_total REAL NOT NULL
) STRICT;

INSERT INTO records (
  timestamp, 
  record_paid_at, 
  record_rounding, 
  record_is_credit, 
  record_cashier, 
  record_mode, 
  record_pay, 
  record_note, 
  method_id, 
  record_fix, 
  record_customer_name, 
  record_customer_phone, 
  record_sub_total, 
  record_total
)
SELECT 
  timestamp, paid_at, rounding, credit, cashier, mode, pay, note, method_id, fix,
  customer_name, customer_phone, 0, 0
FROM records_old;

-----------------------------------------------------
CREATE TABLE record_products (
  record_product_id INTEGER PRIMARY KEY,
  product_id INTEGER REFERENCES products(product_id) ON DELETE SET NULL,
  timestamp INTEGER NOT NULL REFERENCES records(timestamp) ON DELETE CASCADE,
  record_product_name TEXT NOT NULL,
  record_product_price REAL NOT NULL,
  record_product_qty INTEGER NOT NULL,
  record_product_capital REAL NOT NULL,
  record_product_capital_raw REAL NOT NULL,
  record_product_total REAL NOT NULL
) STRICT;

INSERT INTO record_products (
  record_product_id, 
  product_id, 
  timestamp, 
  record_product_name, 
  record_product_price, 
  record_product_qty, 
  record_product_capital, 
  record_product_capital_raw, 
  record_product_total
)
SELECT
  id, product_id, timestamp, name, price, qty, capital, capital, 0
FROM record_products_old;

-----------------------------------------------------
CREATE TABLE discounts (
  discount_id INTEGER PRIMARY KEY,
  record_product_id INTEGER NOT NULL REFERENCES record_products(record_product_id) ON DELETE CASCADE,
  discount_kind TEXT NOT NULL CHECK (discount_kind IN ('number', 'percent', 'pcs')),
  discount_value REAL NOT NULL,
  discount_eff REAL NOT NULL
) STRICT;

INSERT INTO discounts (
  discount_id, 
  record_product_id, 
  discount_kind, 
  discount_value, 
  discount_eff
)
SELECT 
  id, record_item_id, kind, value, 0
FROM discounts_old;

-----------------------------------------------------
CREATE TABLE record_extras (
  record_extra_id INTEGER PRIMARY KEY,
  record_extra_name TEXT NOT NULL,
  timestamp INTEGER NOT NULL REFERENCES records(timestamp) ON DELETE CASCADE,
  record_extra_value REAL NOT NULL,
  record_extra_eff REAL NOT NULL,
  record_extra_kind TEXT NOT NULL CHECK (record_extra_kind IN ('number', 'percent'))
) STRICT;

INSERT INTO record_extras (
  record_extra_id, 
  record_extra_name, 
  timestamp, 
  record_extra_value, 
  record_extra_eff, 
  record_extra_kind
)
SELECT 
  id, name, timestamp, value, 0, kind
FROM record_extras_old;