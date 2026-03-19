-----------------------------------------------------
ALTER TABLE cashiers RENAME TO cashiers_old;
ALTER TABLE money RENAME TO money_old;
ALTER TABLE money_kind RENAME TO money_kind_old;
ALTER TABLE socials RENAME TO socials_old;
ALTER TABLE customers RENAME TO customers_old;

CREATE TABLE cashier_roles (
  v TEXT PRIMARY KEY
) STRICT;

INSERT INTO cashier_roles (v) VALUES ("admin"), ("user");

CREATE TABLE cashiers (
  cashier_id    TEXT PRIMARY KEY,
  cashier_name  TEXT UNIQUE NOT NULL,
  cashier_role  TEXT NOT NULL REFERENCES cashier_roles(v),
  cashier_hash  TEXT NOT NULL 
) STRICT;

INSERT INTO cashiers (cashier_id, cashier_name, cashier_role, cashier_hash)
SELECT cashier_name, cashier_name, cashier_role, cashier_hash FROM cashiers_old;

CREATE TABLE money_kind (
  money_kind_id    TEXT PRIMARY KEY,
  money_kind_name  TEXT NOT NULL,
  money_kind_type  TEXT NOT NULL DEFAULT 'absolute' CHECK (money_kind_type IN ('absolute', 'change')),
  money_kind_updated_at INTEGER NOT NULL,
  money_kind_sync_at    INTEGER
) STRICT;

INSERT INTO money_kind (money_kind_id, money_kind_name, money_kind_type, money_kind_updated_at, money_kind_sync_at)
SELECT CAST(money_kind_id AS TEXT), money_kind_name, money_kind_type, 
       CAST(unixepoch('subsec') * 1000 AS INTEGER), null  
FROM money_kind_old;

CREATE TABLE money (
  money_id         TEXT PRIMARY KEY,
  timestamp        INTEGER NOT NULL,
  money_value      REAL NOT NULL,
  money_kind_id    TEXT NOT NULL REFERENCES money_kind(money_kind_id) ON DELETE CASCADE,
  money_note       TEXT NOT NULL DEFAULT (''),
  money_updated_at INTEGER NOT NULL,
  money_sync_at    INTEGER
) STRICT;

INSERT INTO money (
  money_id,
  timestamp,
  money_value,
  money_kind_id,
  money_note,
  money_updated_at,
  money_sync_at
)
SELECT CAST(timestamp AS TEXT), timestamp, money_value, CAST(money_kind_id AS TEXT), money_note,
       CAST(unixepoch('subsec') * 1000 AS INTEGER), null  
FROM money_old;

-----------------------------------------------------
CREATE TABLE socials (
  social_id         TEXT PRIMARY KEY,
  social_name       TEXT NOT NULL,
  social_value      TEXT NOT NULL,
  social_updated_at INTEGER NOT NULL,
  social_sync_at    INTEGER
) STRICT;

INSERT INTO socials(
  social_id, 
  social_name, 
  social_value,
  social_updated_at,
  social_sync_at
)
SELECT CAST(social_id AS TEXT), social_name, social_value,
       CAST(unixepoch('subsec') * 1000 AS INTEGER), null  
 FROM socials_old;

-----------------------------------------------------
CREATE TABLE customers (
  customer_id         TEXT PRIMARY KEY,
  customer_name       TEXT NOT NULL,
  customer_phone      TEXT NOT NULL,
  customer_updated_at INTEGER NOT NULL,
  customer_sync_at    INTEGER
) STRICT;

INSERT INTO customers (customer_id, customer_name, customer_phone, customer_updated_at, customer_sync_at)
SELECT CAST(customer_id AS TEXT), customer_name, customer_phone,
       CAST(unixepoch('subsec') * 1000 AS INTEGER), null  
FROM customers_old;

-----------------------------------------------------
ALTER TABLE record_extras RENAME TO record_extras_old;
ALTER TABLE discounts RENAME TO discounts_old;
ALTER TABLE record_products RENAME TO record_products_old;
ALTER TABLE records RENAME TO records_old;
ALTER TABLE methods RENAME TO methods_old;
ALTER TABLE extras RENAME TO extras_old;
ALTER TABLE images RENAME TO images_old;
ALTER TABLE products RENAME TO products_old;

-----------------------------------------------------
CREATE TABLE products (
  product_id              TEXT PRIMARY KEY,
  product_barcode         TEXT UNIQUE,
  product_name            TEXT NOT NULL,
  product_price           REAL NOT NULL,
  product_stock           INTEGER NOT NULL,
  product_capital         REAL NOT NULL,
  product_note            TEXT NOT NULL,
  product_updated_at      INTEGER NOT NULL,
  product_sync_at         INTEGER
) STRICT;

INSERT INTO products (
  product_id, product_barcode, product_name, product_price, product_stock, product_capital, product_note,
  product_updated_at, product_sync_at
)
SELECT 
  CAST(product_id AS TEXT), product_barcode, product_name, product_price, product_stock, product_capital, 
  product_note, CAST(unixepoch('subsec') * 1000 AS INTEGER), null
FROM products_old;

-----------------------------------------------------
CREATE TABLE images (
  image_id         TEXT PRIMARY KEY,
  image_name       TEXT NOT NULL,
  image_mime       TEXT NOT NULL REFERENCES img_mimes(v),
  product_id       TEXT NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
  image_updated_at INTEGER NOT NULL,
  image_sync_at    INTEGER
) STRICT;

INSERT INTO images (
  image_id, 
  image_name, 
  image_mime, 
  product_id,
  image_updated_at,
  image_sync_at
)
SELECT 
  CAST(img_id AS TEXT), 
  img_name, 
  img_mime, 
  CAST(product_id AS TEXT), 
  CAST(unixepoch('subsec') * 1000 AS INTEGER), 
  null
FROM images_old;

-----------------------------------------------------
CREATE TABLE extras (
  extra_id    TEXT PRIMARY KEY,
  extra_name  TEXT NOT NULL,
  extra_value REAL NOT NULL,
  extra_kind  TEXT NOT NULL CHECK (extra_kind IN ('number', 'percent')),
  extra_updated_at  INTEGER NOT NULL,
  extra_sync_at     INTEGER
) STRICT;

INSERT INTO extras (
  extra_id, 
  extra_name, 
  extra_value, 
  extra_kind,
  extra_updated_at,
  extra_sync_at
)
SELECT CAST(extra_id AS TEXT), extra_name, extra_value, extra_kind, CAST(unixepoch('subsec') * 1000 AS INTEGER), null
FROM extras_old;


-----------------------------------------------------
CREATE TABLE methods (
  method_id         TEXT PRIMARY KEY,
  method_name       TEXT,
  method_kind       TEXT NOT NULL REFERENCES method_enum(v),
  method_deleted_at INTEGER,
  method_updated_at INTEGER NOT NULL,
  method_sync_at    INTEGER
) STRICT;

INSERT INTO methods (
  method_id,
  method_name,
  method_kind,
  method_updated_at,
  method_sync_at
)
SELECT CAST(method_id AS TEXT), method_name, method_kind, CAST(unixepoch('subsec') * 1000 AS INTEGER), null

FROM methods_old;

-----------------------------------------------------
CREATE TABLE records (
  record_id             TEXT PRIMARY KEY,
  record_paid_at        INTEGER NOT NULL,
  record_rounding       REAL NOT NULL,
  record_is_credit      INTEGER NOT NULL CHECK (record_is_credit IN (0, 1)),
  record_cashier        TEXT NOT NULL,
  record_mode           TEXT NOT NULL REFERENCES mode_enum(v),
  record_pay            REAL NOT NULL,
  record_note           TEXT NOT NULL,
  method_id             TEXT NOT NULL REFERENCES methods(method_id),
  record_fix            INTEGER NOT NULL,
  record_customer_name  TEXT NOT NULL,
  record_customer_phone TEXT NOT NULL,
  record_sub_total      REAL NOT NULL,
  record_total          REAL NOT NULL,
  record_updated_at     INTEGER NOT NULL,
  record_sync_at        INTEGER
) STRICT;

INSERT INTO records (
  record_id, 
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
  record_total,
  record_updated_at,
  record_sync_at
)
SELECT 
  CAST(timestamp AS TEXT), 
  record_paid_at, 
  record_rounding, 
  record_is_credit, 
  record_cashier, 
  record_mode, 
  record_pay, 
  record_note, 
  CAST(method_id AS TEXT), 
  record_fix, 
  record_customer_name, 
  record_customer_phone, 
  record_sub_total, 
  record_total,
  timestamp,
  null
FROM records_old;

-----------------------------------------------------
CREATE TABLE record_products (
  record_product_id          TEXT PRIMARY KEY,
  product_id                 TEXT REFERENCES products(product_id) ON DELETE SET NULL,
  record_id                  TEXT NOT NULL REFERENCES records(record_id) ON DELETE CASCADE,
  record_product_name        TEXT NOT NULL,
  record_product_price       REAL NOT NULL,
  record_product_qty         INTEGER NOT NULL,
  record_product_capital     REAL NOT NULL,
  record_product_capital_raw REAL NOT NULL,
  record_product_total       REAL NOT NULL
) STRICT;

INSERT INTO record_products (
  record_product_id, 
  product_id, 
  record_id, 
  record_product_name, 
  record_product_price, 
  record_product_qty, 
  record_product_capital, 
  record_product_capital_raw, 
  record_product_total
)
SELECT
  CAST(record_product_id AS TEXT), 
  CAST(product_id AS TEXT), 
  CAST(timestamp AS TEXT), 
  record_product_name, 
  record_product_price, 
  record_product_qty, 
  record_product_capital, 
  record_product_capital_raw, 
  record_product_total
FROM record_products_old;

-----------------------------------------------------
CREATE TABLE discounts (
  discount_id       TEXT PRIMARY KEY,
  record_product_id TEXT NOT NULL REFERENCES record_products(record_product_id) ON DELETE CASCADE,
  discount_kind     TEXT NOT NULL CHECK (discount_kind IN ('number', 'percent', 'pcs')),
  discount_value    REAL NOT NULL,
  discount_eff      REAL NOT NULL
) STRICT;

INSERT INTO discounts (
  discount_id,
  record_product_id,
  discount_kind, 
  discount_value, 
  discount_eff
)
SELECT 
  CAST(discount_id AS TEXT), 
  CAST(record_product_id AS TEXT), 
  discount_kind, 
  discount_value, 
  discount_eff
FROM discounts_old;

-----------------------------------------------------
CREATE TABLE record_extras (
  record_extra_id    TEXT PRIMARY KEY,
  record_extra_name  TEXT NOT NULL,
  record_id          TEXT NOT NULL REFERENCES records(record_id) ON DELETE CASCADE,
  record_extra_value REAL NOT NULL,
  record_extra_eff   REAL NOT NULL,
  record_extra_kind  TEXT NOT NULL CHECK (record_extra_kind IN ('number', 'percent'))
) STRICT;

INSERT INTO record_extras (
  record_extra_id, 
  record_extra_name, 
  record_id, 
  record_extra_value, 
  record_extra_eff, 
  record_extra_kind
)
SELECT 
  CAST(record_extra_id AS TEXT), 
  record_extra_name, 
  CAST(timestamp AS TEXT), 
  record_extra_value, 
  record_extra_eff, 
  record_extra_kind
FROM record_extras_old;

----------------------------------------------
DROP TABLE record_extras_old;
DROP TABLE discounts_old;
DROP TABLE record_products_old;
DROP TABLE records_old;
DROP TABLE methods_old;
DROP TABLE extras_old;
DROP TABLE images_old;
DROP TABLE products_old;
DROP TABLE customers_old;
DROP TABLE socials_old;
DROP TABLE money_kind_old;
DROP TABLE money_old;
DROP TABLE cashiers_old;