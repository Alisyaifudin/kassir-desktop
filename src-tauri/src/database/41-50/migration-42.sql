DROP TABLE IF EXISTS graves_kind;
DROP TABLE IF EXISTS graves;

ALTER TABLE money_kind RENAME TO money_kind_old;
ALTER TABLE money RENAME TO money_old;
ALTER TABLE products RENAME TO products_old;
ALTER TABLE product_events RENAME TO products_events_old;
ALTER TABLE methods RENAME TO methods_old;
ALTER TABLE records RENAME TO records_old;
ALTER TABLE record_extras RENAME TO record_extras_old;
ALTER TABLE record_products RENAME TO record_products_old;
ALTER TABLE discounts RENAME TO discounts_old;
ALTER TABLE images RENAME TO images_old;

ALTER TABLE customers ADD COLUMN customer_deleted_at INTEGER;
ALTER TABLE socials ADD COLUMN social_deleted_at INTEGER;
ALTER TABLE extra ADD COLUMN extra_deleted_at INTEGER;

CREATE TABLE images (
    image_id         TEXT    PRIMARY KEY,
    image_order      INTEGER NOT NULL,
    image_name       TEXT    NOT NULL,
    image_mime       TEXT    NOT NULL
                             REFERENCES img_mimes (v),
    product_id       TEXT    NOT NULL
                             REFERENCES products (product_id) ON DELETE CASCADE,
    image_updated_at INTEGER NOT NULL,
    image_sync_at    INTEGER,
    image_deleted_at INTEGER,
    image_hash       TEXT
) STRICT;

INSERT INTO images (
  image_id, image_order, image_name, image_mime,
  product_id, image_updated_at, image_sync_at,
  image_deleted_at
)
SELECT
  image_id, image_order, image_name, image_mime,
  product_id, image_updated_at, image_sync_at,
  image_deleted_at
FROM images_old;

CREATE TABLE pocket_enum (
  v TEXT PRIMARY KEY
) STRICT;

INSERT INTO pocket_enum (v) VALUES ('absolute'), ('change');

CREATE TABLE pockets (
    pocket_id         TEXT    PRIMARY KEY,
    pocket_name       TEXT    NOT NULL,
    pocket_type       TEXT    NOT NULL DEFAULT 'absolute'
                              REFERENCES pocket_enum(v),
    pocket_ordering   INTEGER NOT NULL,
    pocket_updated_at INTEGER NOT NULL,
    pocket_sync_at    INTEGER,
    pocket_deleted_at INTEGER
) STRICT;

INSERT INTO pockets (
  pocket_id, pocket_name, pocket_type, pocket_updated_at, pocket_sync_at, pocket_ordering
)
SELECT 
  money_kind_id, money_kind_name, money_kind_type, money_kind_updated_at, money_kind_sync_at, money_kind_ordering
FROM money_kind_old;

CREATE TABLE money (
    money_id         TEXT    PRIMARY KEY,
    timestamp        INTEGER NOT NULL,
    money_value      REAL    NOT NULL,
    pocket_id        TEXT    NOT NULL
                             REFERENCES pockets (pocket_id) ON DELETE CASCADE,
    money_note       TEXT    NOT NULL
                             DEFAULT (''),
    money_updated_at INTEGER NOT NULL,
    money_sync_at    INTEGER,
    money_deleted_at INTEGER
)
STRICT;

INSERT INTO money (
  money_id, timestamp, money_value, pocket_id, money_note, money_updated_at, money_sync_at
)
SELECT
  money_id, timestamp, money_value, pocket_id, money_note, money_updated_at, money_sync_at
FROM money_old;


CREATE TABLE products (
    product_id         TEXT    PRIMARY KEY,
    product_name       TEXT    NOT NULL,
    product_price      REAL    NOT NULL,
    product_note       TEXT    NOT NULL,
    product_updated_at INTEGER NOT NULL,
    product_sync_at    INTEGER,
    product_deleted_at INTEGER
) STRICT;

INSERT INTO products (
  product_id, product_name, product_price, product_note, product_updated_at, product_sync_at
)
SELECT 
  product_id, product_name, product_price, product_note, product_updated_at, product_sync_at
FROM products_old;


CREATE TABLE product_codes (
  product_code            TEXT  PRIMARY KEY,
  product_id              TEXT  NOT NULL
                          REFERENCES products(product_id)
                          ON DELETE CASCADE
) STRICT;

INSERT INTO product_codes (
  product_code, product_id
)
SELECT 
  barcode, product_id
FROM products_old;

CREATE TABLE capitals (
  capital_id          TEXT    PRIMARY KEY,
  capital_stock       INTEGER NOT NULL,
  capital_capital     REAL    NOT NULL,
  capital_deleted_at  INTEGER,
  capital_updated_at  INTEGER NOT NULL,
  capital_sync_at     INTEGER,
  product_id          TEXT    NOT NULL
                              REFERENCES products(product_id) 
                              ON DELETE CASCADE
) STRICT;

INSERT INTO capitals (
  capital_id,  -- for migration purpose, use product_id
  capital_stock, capital_capital, capital_updated_at, product_id
)
SELECT
  product_id, product_stock, product_capital, product_updated_at, product_id 
FROM products_old;


CREATE TABLE product_events (
    product_event_id      TEXT    PRIMARY KEY,
    timestamp             INTEGER NOT NULL,
    product_event_note    TEXT    NOT NULL,
    product_event_sync_at INTEGER,
    product_event_value   INTEGER NOT NULL,
    capital_id            TEXT    NOT NULL
                                  REFERENCES capitals (capital_id) ON DELETE CASCADE
) STRICT;


CREATE TABLE methods (
    method_id         TEXT    PRIMARY KEY,
    method_name       TEXT, -- public facing name
    method_label      TEXT, -- internal name
    method_kind       TEXT    NOT NULL
                              REFERENCES method_enum (v),
    method_deleted_at INTEGER,
    method_updated_at INTEGER NOT NULL,
    method_sync_at    INTEGER
) STRICT;

INSERT INTO methods (
  method_id, method_name, method_label, method_kind, method_deleted_at, method_updated_at, method_sync_at
)
SELECT 
  method_id, method_name, 
  method_name, -- use name for label migration 
  method_kind, method_deleted_at, method_updated_at, method_sync_at
FROM methods_old;

INSERT INTO mode_enum(v) VALUES ('in'), ('out');


CREATE TABLE records (
    record_id             TEXT    PRIMARY KEY,
    record_created_at     INTEGER NOT NULL,
    timestamp             INTEGER NOT NULL,
    record_rounding       REAL    NOT NULL,
    record_credit_at      INTEGER,
    record_cashier        TEXT    NOT NULL,
    record_mode           TEXT    NOT NULL
                                  REFERENCES mode_enum (v),
    record_pay            REAL    NOT NULL,
    record_note           TEXT    NOT NULL,
    method_id             TEXT    NOT NULL
                                  REFERENCES methods (method_id),
    record_fix            INTEGER NOT NULL,
    customer_id           TEXT    REFERENCES customers (customer_id) ON DELETE SET NULL,
    record_sub_total      REAL    NOT NULL, -- total from items
    record_total          REAL    NOT NULL, -- total after extras
    -- grand total = total + rounding
    record_updated_at     INTEGER NOT NULL,
    record_sync_at        INTEGER,
    record_deleted_at     INTEGER
)
STRICT;

INSERT INTO records (
  record_id, record_created_at, timestamp, record_rounding,
  record_credit_at, record_cashier, record_mode, record_pay, record_note,
  method_id, record_fix, record_sub_total, record_total,
  record_updated_at, record_sync_at
)
SELECT 
  record_id, record_paid_at, record_paid_at, record_rounding,
  CASE WHEN record_is_credit = 1 THEN record_paid_at END,
  record_cashier, 
  CASE WHEN record_mode = 'buy' THEN 'out' ELSE 'in' END, 
  record_pay, record_note,
  method_id, record_fix, record_sub_total, record_total,
  record_updated_at, record_sync_at
FROM records_old;

CREATE TABLE record_products (
    record_product_id          TEXT    PRIMARY KEY,
    product_event_id           TEXT    REFERENCES product_events (product_event_id) ON DELETE SET NULL,
    record_id                  TEXT    NOT NULL
                                       REFERENCES records (record_id) ON DELETE CASCADE,
    record_product_name        TEXT    NOT NULL,
    record_product_price       REAL    NOT NULL,
    record_product_qty         INTEGER NOT NULL,
    record_product_capital     REAL    NOT NULL,
    -- capital raw is deleted, capital now is capita raw
    record_product_total       REAL    NOT NULL
) STRICT;

INSERT INTO record_products (
  record_product_id, capital_id, record_id, record_product_name,
  record_product_price, record_product_qty, record_product_capital, 
  record_product_total
)
SELECT 
  record_product_id, product_id, record_id, record_product_name,
  record_product_price, record_product_qty, record_product_capital_raw, 
  record_product_total
FROM record_products_old;

CREATE TABLE discount_enum (
  v TEXT PRIMARY KEY
) STRICT;

INSERT INTO discount_enum (v) VALUES ('number'), ('percent'), ('pcs');

CREATE TABLE discounts (
    discount_id       TEXT PRIMARY KEY,
    record_product_id TEXT NOT NULL
                           REFERENCES record_products (record_product_id) ON DELETE CASCADE,
    discount_kind     TEXT NOT NULL
                           REFERENCES discount_enum (v),
    discount_value    REAL NOT NULL,
    discount_eff      REAL NOT NULL
) STRICT;

INSERT INTO discounts (
  discount_id, record_product_id, discount_kind, discount_value, discount_eff
)
SELECT 
  discount_id, record_product_id, discount_kind, discount_value, discount_eff
FROM discounts_old;

DROP TABLE images_old;
DROP TABLE discounts_old;
DROP TABLE record_products_old;
DROP TABLE record_extras_old;
DROP TABLE methods_old;
DROP TABLE records_old;
DROP TABLE product_events_old;
DROP TABLE products_old;
DROP TABLE money_old;
DROP TABLE money_kind_old;
DELETE FROM mode_enum WHERE v = 'buy' OR v = 'sell';