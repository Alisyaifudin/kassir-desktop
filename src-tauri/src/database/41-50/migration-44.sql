-- ============================================================================
-- migration-44   Port the `tx.db` cart tables into `data.db`
-- ============================================================================
-- tx.db was a standalone SQLite/sqlx database holding the active POS cart. Its
-- tables are re-created here under the `tx_` namespace so they can live
-- alongside data.db's catalog/record tables without collisions.
--
-- Naming / shape changes vs the tx.db originals
--   * Every table is prefixed `tx_`, and every column is renamed to the
--     `<singular>_<field>` convention used across data.db.
--   * `transactions` -> `tx_records` (PK `tab` INTEGER -> `tx_record_id` TEXT;
--                       adds `tx_record_order` / `tx_record_flag`, drops
--                       `tx_record_created_at`).
--   * `extras`       -> `tx_extras` (drops `db_extra_id`; adds `tx_extra_eff`).
--   * `products`     -> `tx_listings`: no longer denormalizes product data;
--                       references the live `listings` table via `listing_id`
--                       (ON DELETE SET NULL).
--   * `discounts`    -> `tx_discounts`, now parented by `tx_listings`.
--   * dropped: `versions` (unused) and `discount_kind_enum` (its three values
--     are now a CHECK on `tx_discounts.tx_disc_kind`).
--
-- New (not sourced from tx.db):
--   * `tx_methods` — the methods selected by a `tx_records` row
--     (`tx_record_id`, `method_id`, `tx_method_value`).
--
-- Deliberately NOT ported:
--   * `_sqlx_migrations` — sqlx's own migration bookkeeping for tx.db, which
--     data.db already owns (tauri-plugin-sql). Copying it would clash with and
--     corrupt data.db's migration history.
-- ============================================================================


-- Main table. Was `transactions`; renamed to `tx_records`.
CREATE TABLE tx_records (
  tx_record_id              TEXT PRIMARY KEY,
  tx_record_order           INTEGER NOT NULL, -- user-controlled tab order (re-arrangeable; not unique by design)
  tx_record_flag            INTEGER NOT NULL DEFAULT 0, -- local flag (role TBD)
  tx_record_title           TEXT NOT NULL,
  -- 'incoming' is a sale, which is what the legacy cart defaulted to ('sell').
  tx_record_mode            TEXT NOT NULL DEFAULT ('incoming') CHECK (tx_record_mode IN ('incoming', 'outcoming')),
  tx_record_query           TEXT NOT NULL DEFAULT (''),
  tx_record_fix             INTEGER NOT NULL DEFAULT 0,
  tx_record_note            TEXT NOT NULL DEFAULT (''),
  tx_record_customer_id     TEXT, -- change from INTEGER TO TEXT
  tx_record_manual_code     TEXT NOT NULL DEFAULT (''),
  tx_record_manual_name     TEXT NOT NULL DEFAULT (''),
  tx_record_manual_price    REAL NOT NULL DEFAULT 0,
  tx_record_manual_qty      INTEGER NOT NULL DEFAULT 0
) STRICT;


-- Was `extras` (dropped `db_extra_id`; added `tx_extra_eff`).
CREATE TABLE tx_extras (
  tx_extra_order     INTEGER PRIMARY KEY,
  tx_extra_id        TEXT NOT NULL UNIQUE,
  tx_record_id       TEXT NOT NULL REFERENCES tx_records(tx_record_id) ON DELETE CASCADE,
  tx_extra_kind      TEXT NOT NULL CHECK (tx_extra_kind IN ('percent', 'number')),
  tx_extra_name      TEXT NOT NULL,
  tx_extra_value     REAL NOT NULL,
  tx_extra_eff       REAL NOT NULL
) STRICT;

CREATE INDEX tx_idx_extras_extra_id ON tx_extras(tx_extra_id);


-- Not in tx.db: the methods selected by a `tx_records` row. One row per
-- selected method; `tx_method_value` is the amount applied to that method.
CREATE TABLE tx_methods (
  tx_record_id          TEXT NOT NULL REFERENCES tx_records(tx_record_id) ON DELETE CASCADE,
  method_id             TEXT NOT NULL REFERENCES methods(method_id) ON DELETE CASCADE,
  tx_method_value       INTEGER NOT NULL,
  PRIMARY KEY (tx_record_id, method_id)
) STRICT;


-- Was `products` (now a listing snapshot referencing the live catalog).
CREATE TABLE tx_listings (
  tx_listing_id          TEXT PRIMARY KEY,
  tx_record_id           TEXT NOT NULL REFERENCES tx_records(tx_record_id) ON DELETE CASCADE,
  listing_id             TEXT REFERENCES listings(listing_id) ON DELETE SET NULL,
  tx_listing_name        TEXT NOT NULL,
  tx_listing_price       REAL NOT NULL,
  tx_listing_unit        INTEGER NOT NULL,
  tx_listing_qty         INTEGER NOT NULL,
  tx_listing_kind        TEXT NOT NULL DEFAULT 'retail'
) STRICT;




-- Was `discounts`.
CREATE TABLE tx_discounts (
  tx_disc_order    INTEGER PRIMARY KEY,
  tx_disc_id       TEXT NOT NULL UNIQUE,
  tx_listing_id    TEXT NOT NULL REFERENCES tx_listings(tx_listing_id) ON DELETE CASCADE,
  tx_disc_value    REAL NOT NULL DEFAULT 0,
  tx_disc_eff      REAL NOT NULL DEFAULT 0,
  tx_disc_kind     TEXT NOT NULL DEFAULT 'percent' CHECK (tx_disc_kind IN ('number', 'percent', 'pcs'))
) STRICT;
