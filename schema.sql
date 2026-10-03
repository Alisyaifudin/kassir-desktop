CREATE TABLE _sqlx_migrations (
    version BIGINT PRIMARY KEY,
    description TEXT NOT NULL,
    installed_on TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    success BOOLEAN NOT NULL,
    checksum BLOB NOT NULL,
    execution_time BIGINT NOT NULL
);
CREATE TABLE money_type (
  kind TEXT PRIMARY KEY
) STRICT;
CREATE TABLE value_kind_enum(
  v TEXT PRIMARY KEY
) STRICT;
CREATE TABLE mode_enum(
  v TEXT PRIMARY KEY
) STRICT;
CREATE TABLE method_enum(
  v TEXT PRIMARY KEY
) STRICT;
CREATE TABLE role_enum(
  v TEXT PRIMARY KEY
) STRICT;
CREATE TABLE versions (
  v INTEGER PRIMARY KEY
) STRICT;
CREATE TABLE img_mimes (
  v TEXT PRIMARY KEY
) STRICT;
CREATE TABLE graves_kind (
  v TEXT PRIMARY KEY
) STRICT;
CREATE TABLE graves (
  grave_id         TEXT PRIMARY KEY,
  grave_item_id    TEXT NOT NULL,
  grave_kind       TEXT NOT NULL REFERENCES graves_kind(v) ON DELETE CASCADE, 
  grave_timestamp  INTEGER NOT NULL
) STRICT;
CREATE TABLE cashier_roles (
  v TEXT PRIMARY KEY
) STRICT;
CREATE TABLE cashiers (
  cashier_id    TEXT PRIMARY KEY,
  cashier_name  TEXT UNIQUE NOT NULL,
  cashier_role  TEXT NOT NULL REFERENCES cashier_roles(v),
  cashier_hash  TEXT NOT NULL 
) STRICT;
CREATE TABLE money_kind (
  money_kind_id    TEXT PRIMARY KEY,
  money_kind_name  TEXT NOT NULL,
  money_kind_type  TEXT NOT NULL DEFAULT 'absolute' CHECK (money_kind_type IN ('absolute', 'change')),
  money_kind_updated_at INTEGER NOT NULL,
  money_kind_sync_at    INTEGER
, money_kind_ordering INTEGER NOT NULL DEFAULT 0) STRICT;
CREATE TABLE money (
  money_id         TEXT PRIMARY KEY,
  timestamp        INTEGER NOT NULL,
  money_value      REAL NOT NULL,
  money_kind_id    TEXT NOT NULL REFERENCES money_kind(money_kind_id) ON DELETE CASCADE,
  money_note       TEXT NOT NULL DEFAULT (''),
  money_updated_at INTEGER NOT NULL,
  money_sync_at    INTEGER
) STRICT;
CREATE TABLE socials (
  social_id         TEXT PRIMARY KEY,
  social_name       TEXT NOT NULL,
  social_value      TEXT NOT NULL,
  social_updated_at INTEGER NOT NULL,
  social_sync_at    INTEGER
) STRICT;
CREATE TABLE customers (
  customer_id         TEXT PRIMARY KEY,
  customer_name       TEXT NOT NULL,
  customer_phone      TEXT NOT NULL,
  customer_updated_at INTEGER NOT NULL,
  customer_sync_at    INTEGER
) STRICT;
CREATE TABLE methods (
  method_id         TEXT PRIMARY KEY,
  method_name       TEXT,
  method_kind       TEXT NOT NULL REFERENCES method_enum(v),
  method_deleted_at INTEGER,
  method_updated_at INTEGER NOT NULL,
  method_sync_at    INTEGER
) STRICT;
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
CREATE TABLE images (
  image_id         TEXT PRIMARY KEY,
  image_order      INTEGER NOT NULL,
  image_name       TEXT NOT NULL,
  image_mime       TEXT NOT NULL REFERENCES img_mimes(v),
  product_id       TEXT NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
  image_updated_at INTEGER NOT NULL,
  image_sync_at    INTEGER
) STRICT;
CREATE TABLE extras (
  extra_id    TEXT PRIMARY KEY,
  extra_name  TEXT NOT NULL,
  extra_value REAL NOT NULL,
  extra_kind  TEXT NOT NULL CHECK (extra_kind IN ('number', 'percent')),
  extra_updated_at  INTEGER NOT NULL,
  extra_sync_at     INTEGER
, extra_flag INTEGER NOT NULL DEFAULT 0) STRICT;
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
CREATE TABLE discounts (
  discount_id       TEXT PRIMARY KEY,
  record_product_id TEXT NOT NULL REFERENCES record_products(record_product_id) ON DELETE CASCADE,
  discount_kind     TEXT NOT NULL CHECK (discount_kind IN ('number', 'percent', 'pcs')),
  discount_value    REAL NOT NULL,
  discount_eff      REAL NOT NULL
) STRICT;
CREATE TABLE record_extras (
  record_extra_id    TEXT PRIMARY KEY,
  record_extra_name  TEXT NOT NULL,
  record_id          TEXT NOT NULL REFERENCES records(record_id) ON DELETE CASCADE,
  record_extra_value REAL NOT NULL,
  record_extra_eff   REAL NOT NULL,
  record_extra_kind  TEXT NOT NULL CHECK (record_extra_kind IN ('number', 'percent'))
) STRICT;
CREATE TABLE product_event_enum (
  v TEXT PRIMARY KEY
) STRICT;
CREATE TABLE product_events (
  id         TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  sync_at    INTEGER,
  type       TEXT NOT NULL REFERENCES product_event_enum(v),
  value      INTEGER NOT NULL,
  product_id TEXT NOT NULL REFERENCES products(product_id) ON DELETE CASCADE
) STRICT;
