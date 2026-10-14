-- ============================================================================
-- repair: money_kind -> pocket naming
-- ============================================================================
-- Migrations 39 and 41 are what renamed this concept to `pocket*`, but a
-- database migrated before that rename recorded them as already applied — so it
-- never receives the rename. Re-running the later migrations leaves it on
-- `money_kind` permanently while a fresh install ends up on `pockets`, and the
-- two schemas stay divorced.
--
-- This cannot be a migration. Every statement names one table or the other, so it
-- would fail on whichever lineage lacks that name, and one failing statement
-- aborts a migration batch. It is a one-off repair instead.
--
-- RUN IT BEFORE the app applies 42-45, while the database is still on
-- `money_kind`. Then migration-43 adds `money_deleted_at` and
-- `pocket_deleted_at` itself, exactly as it does for a fresh install — so both
-- lineages end up with the same schema instead of one column apart. That is why
-- the `money` rebuild below has no `money_deleted_at`: it is rebuilt to the
-- shape this database is actually in.
--
-- Each statement is atomic, so a second run fails on the first ALTER and changes
-- nothing.
-- ============================================================================

ALTER TABLE money_kind RENAME TO pockets;

ALTER TABLE pockets RENAME COLUMN money_kind_id        TO pocket_id;
ALTER TABLE pockets RENAME COLUMN money_kind_name      TO pocket_name;
ALTER TABLE pockets RENAME COLUMN money_kind_type      TO pocket_type;
ALTER TABLE pockets RENAME COLUMN money_kind_updated_at TO pocket_updated_at;
ALTER TABLE pockets RENAME COLUMN money_kind_sync_at   TO pocket_sync_at;
ALTER TABLE pockets RENAME COLUMN money_kind_ordering  TO pocket_ordering;

-- `money` is rebuilt rather than column-renamed. Its REFERENCES clause still
-- names the old table, and whether SQLite rewrites that during a RENAME depends
-- on `PRAGMA legacy_alter_table` — the CLI defaults it on, the app's driver
-- defaults it off, so the same script would leave two different schemas.
-- Rebuilding makes the outcome identical either way.
-- It is the only table pointing at the kind table.
ALTER TABLE money RENAME TO money_before_pocket_rename;

CREATE TABLE money (
  money_id         TEXT PRIMARY KEY,
  timestamp        INTEGER NOT NULL,
  money_value      REAL NOT NULL,
  pocket_id        TEXT NOT NULL REFERENCES pockets(pocket_id) ON DELETE CASCADE,
  money_note       TEXT NOT NULL DEFAULT (''),
  money_updated_at INTEGER NOT NULL,
  money_sync_at    INTEGER
) STRICT;

INSERT INTO money (
  money_id, timestamp, money_value, pocket_id, money_note,
  money_updated_at, money_sync_at
)
SELECT
  money_id, timestamp, money_value, money_kind_id, money_note,
  money_updated_at, money_sync_at
FROM money_before_pocket_rename;

DROP TABLE money_before_pocket_rename;
