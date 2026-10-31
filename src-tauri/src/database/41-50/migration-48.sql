-- ============================================================================
-- migration-48   Drop the parked `*_old` tables.
-- ============================================================================
-- Migration-43 parked every table it rebuilt as `<name>_old` and promised no
-- `DROP TABLE`; migration-44 moved the rows across and also left the parked
-- tables in place. Both have shipped, so the drop cannot be added to either —
-- sqlx fingerprints each migration's text and a changed byte is
-- `VersionMismatch` on every installed database (pinned by
-- `src/services/db/migration-chain.test.ts`). It lives here instead.
--
-- Nothing reads them any more: the backfill is done (44), and no live table,
-- view or trigger references a `*_old` name (checked over the whole chain —
-- `PRAGMA foreign_key_list` on every table returns nothing whose parent ends in
-- `_old`). The foreign keys *inside* the parked tables were rewritten by 43's
-- renames and now point at live tables or at parents that no longer exist
-- (`records_old` → `mode_enum`), so removing them costs nothing.
--
-- One statement per table rather than a loop: SQL has no way to iterate
-- `sqlite_master` and then execute the rows it finds. The list is exactly the
-- set 43 parks — those twelve are the only `*_old` tables any lineage reaches
-- the end of the chain with (the earlier parks from 07/09/11-13/15/21-39 are all
-- dropped inside those same migrations). `IF EXISTS` so a database that was
-- already cleaned by hand still migrates.
--
-- Ordered child-first (the order 43's renames create them in reverse): SQLite
-- runs `DROP TABLE` as an implicit `DELETE FROM`, so under an enforcing
-- `foreign_keys` a parent dropped before its parked child could trip a
-- constraint. The pragma below is a no-op under sqlx (it stays ON inside the
-- transaction), so the order has to carry the guarantee either way.
-- ============================================================================

PRAGMA foreign_keys = OFF;      -- no-op under sqlx; kept so the file also runs in the CLI
PRAGMA busy_timeout = 30000;


-- ----------------------------------------------------------------------------
-- 1. Parked children.
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS record_extras_old;
DROP TABLE IF EXISTS discounts_old;
DROP TABLE IF EXISTS record_products_old;
DROP TABLE IF EXISTS product_events_old;
DROP TABLE IF EXISTS images_old;

-- ----------------------------------------------------------------------------
-- 2. Parked parents (each one emptied of the children above).
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS records_old;
DROP TABLE IF EXISTS products_old;
DROP TABLE IF EXISTS money_old;
DROP TABLE IF EXISTS graves_old;
DROP TABLE IF EXISTS mode_enum_old;
DROP TABLE IF EXISTS money_kind_old;
DROP TABLE IF EXISTS graves_kind_old;


PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 30;
