-- ============================================================================
-- migration-65   Financial report: sync the report group.
-- ============================================================================
-- The report (migration-63/64) was written local-only on purpose: "the report
-- feature is finished before sync is touched" (REPORT.md §10.3). This is the
-- migration that makes it syncable. It adds the sync trio to the three report
-- tables and, more importantly, gives every row an identity two tills can agree
-- on without a custom merge rule.
--
-- Why the ids change
-- ------------------
-- Every other synced table is keyed on an id its own device minted. That is fine
-- for a product or a customer — two tills creating one each is two rows, and the
-- user asked for both. It is not fine for the report:
--
--   * the built-in categories were seeded on every install with
--     `upper(hex(randomblob(13)))`, so every device has *its own* `Jual` row.
--     After a merge that is seven pairs of the same category, and the seed's
--     `WHERE report_category_slug = 'jual'` still picks one arbitrarily.
--   * a classification is per *line*, and two tills may both classify the same
--     line (the "both registers classified one line differently" case REPORT.md
--     §10.3 deferred). Two random ids for one line would violate
--     `report_lines.record_listing_group_id UNIQUE` on the second merge and
--     block the whole group forever.
--   * `Buat laporan` on two tills would create two `report_periods` rows for the
--     same day, violating `UNIQUE (report_period_kind, report_period_start)`.
--
-- So the identity becomes deterministic, derived from the thing that already
-- identifies the row across devices:
--
--   category  `C:<slug>`                  the slug is the stable handle (it
--                                         already never changes on rename)
--   line      `L:<record_listing_group_id>` / `X:<record_extra_id>`
--                                         the line identity migration-63 chose
--   period    `P:<kind>:<start>`          the day/period the closure is about
--
-- Two devices now derive the same primary key, so the ordinary last-writer-wins
-- rule already resolves a conflict — no second merge algorithm. For a
-- classification the clock is `report_line_at` (when a human decided), with one
-- extra rule: a category the operator chose (`report_line_auto = 0`) outranks
-- one the app filled in (`= 1`), whatever the clocks say. That is what stops a
-- "Buat laporan" seed on a device that had not synced yet from overwriting a
-- partner's deliberate classification.
--
-- Why the foreign keys change
-- ---------------------------
-- * `report_lines.record_extra_id` loses its `ON DELETE CASCADE` (and its FK).
--   A record aggregate is *replaced* by the sync merge (delete every child,
--   re-insert it), which fired that cascade on every other device and silently
--   deleted the classifications of the record's extras — they were already past
--   the bookmark, so nothing brought them back.
-- * `report_lines` loses its `record_id` and `report_category_id` FKs too. The
--   server enforces no cross-row order, so a page may carry a classification
--   before the record or category it names; with an FK that page fails forever,
--   because the bookmark cannot advance past it. Without one the row lands, the
--   report's universe (`records` joined to its own lines) simply does not see it
--   until the record arrives, and an orphan is inert rather than a stuck group.
--   The app checks both on a local write; the merge must be able to store what
--   the server sent.
--
-- Why `report_category_name` stops being UNIQUE
-- --------------------------------------------
-- `migration-55` dropped `category_name_unique` for the same reason: two devices
-- may independently create the same label, and a pull page has to be able to
-- store both. The picker's "that name is taken" rule lives in the service, not
-- the schema. The slug stays UNIQUE: because it *is* the primary key now, two
-- rows can never share it anyway.
--
-- The trio, per the conventions in migration-43: `<singular>_updated_at` +
-- `<singular>_sync_at` + `<singular>_deleted_at`.
--   * `report_lines` reuses `report_line_at` as its clock — it is already the
--     moment a human decided, and a second timestamp would be a third answer to
--     the same question (migration-63's note). It gains `_sync_at` and a
--     `_deleted_at` so a future "un-classify" is a tombstone rather than a
--     DELETE the log cannot describe.
--   * `report_periods` and `report_categories` already had `_updated_at`; they
--     gain `_sync_at` and (for categories) keep their `_deleted_at`.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. `report_lines` — re-key by the line's own identity, drop the two FKs that
--    a wholesale record replacement would trip, add the sync columns.
--
--    This runs before the category rebuild on purpose: nothing references a
--    `report_line_id`, and after this table no longer points at
--    `report_categories`, so that table can be rebuilt without a deferred FK.
-- ----------------------------------------------------------------------------
CREATE TABLE report_lines_new (
  report_line_id          TEXT PRIMARY KEY,
  -- The record. No FK — see the header: a page must be able to land before it.
  record_id               TEXT NOT NULL,
  -- A listing line, by the group the operator entered. No FK — see the header.
  record_listing_group_id TEXT UNIQUE,
  -- An extra line. No FK: a record aggregate's replacement deletes and re-inserts
  -- its extras, and a cascade here would take the classification with it.
  record_extra_id         TEXT UNIQUE,
  report_category_id      TEXT NOT NULL,
  -- `records.record_updated_at` at classification time.
  report_line_source_rev INTEGER NOT NULL,
  -- 1 = filled in by the app (the mode default, or a `dual` charge), 0 = chosen.
  -- Also the sync precedence flag: 0 outranks 1 when two tills disagree.
  report_line_auto       INTEGER NOT NULL,
  -- When the operator decided — and the row's LWW clock.
  report_line_at         INTEGER NOT NULL,
  report_line_sync_at    INTEGER,
  report_line_deleted_at INTEGER,
  CHECK ((record_listing_group_id IS NULL) <> (record_extra_id IS NULL))
) STRICT;

INSERT INTO report_lines_new (
  report_line_id, record_id, record_listing_group_id, record_extra_id,
  report_category_id, report_line_source_rev, report_line_auto, report_line_at,
  report_line_sync_at, report_line_deleted_at
)
SELECT
  CASE
    WHEN record_listing_group_id IS NOT NULL THEN 'L:' || record_listing_group_id
    ELSE 'X:' || record_extra_id
  END,
  record_id, record_listing_group_id, record_extra_id,
  report_category_id, report_line_source_rev, report_line_auto, report_line_at,
  NULL, NULL
FROM report_lines;

DROP TABLE report_lines;
ALTER TABLE report_lines_new RENAME TO report_lines;

-- The category index is still the one the report's GROUP BY and the category
-- delete guard seek on.
CREATE INDEX report_line_category_idx ON report_lines (report_category_id);

-- ----------------------------------------------------------------------------
-- 2. `report_categories` — deterministic id, sync trio, name no longer UNIQUE.
--    Built-ins start at clock 0 so a rename on any device always outranks the
--    seeded label; an existing custom category starts at "now" so it is treated
--    as a real row rather than an ancient default.
-- ----------------------------------------------------------------------------
CREATE TABLE report_categories_new (
  report_category_id         TEXT PRIMARY KEY,
  report_category_name       TEXT NOT NULL,
  report_category_slug       TEXT NOT NULL UNIQUE,
  report_category_builtin    INTEGER NOT NULL DEFAULT 0,
  report_category_order      INTEGER NOT NULL DEFAULT 0,
  report_category_updated_at INTEGER NOT NULL DEFAULT 0,
  report_category_sync_at    INTEGER,
  report_category_deleted_at INTEGER
) STRICT;

INSERT INTO report_categories_new (
  report_category_id, report_category_name, report_category_slug,
  report_category_builtin, report_category_order,
  report_category_updated_at, report_category_sync_at, report_category_deleted_at
)
SELECT
  'C:' || report_category_slug,
  report_category_name,
  report_category_slug,
  report_category_builtin,
  report_category_order,
  CASE
    WHEN report_category_builtin <> 0 THEN 0
    ELSE CAST(strftime('%s', 'now') AS INTEGER) * 1000
  END,
  NULL,
  report_category_deleted_at
FROM report_categories;

-- Re-point every classification at the category's new id. This runs while the
-- old table still exists, so the slug is still readable.
UPDATE report_lines
   SET report_category_id = 'C:' || (
         SELECT c.report_category_slug
           FROM report_categories c
          WHERE c.report_category_id = report_lines.report_category_id
       )
 WHERE EXISTS (
         SELECT 1 FROM report_categories c
          WHERE c.report_category_id = report_lines.report_category_id
       );

DROP TABLE report_categories;
ALTER TABLE report_categories_new RENAME TO report_categories;

-- ----------------------------------------------------------------------------
-- 3. `report_periods` — deterministic id, `_sync_at`. Closure is still a claim
--    about a (kind, start) pair, and that pair is already UNIQUE; the id is now
--    derived from it so two tills pressing "Buat laporan" for the same day is
--    one row, not a constraint violation.
-- ----------------------------------------------------------------------------
CREATE TABLE report_periods_new (
  report_period_id         TEXT PRIMARY KEY,
  report_period_kind       TEXT NOT NULL CHECK (report_period_kind IN
                             ('day', 'week', 'month', 'quarter', 'year')),
  report_period_start      INTEGER NOT NULL,
  report_period_end        INTEGER NOT NULL,
  report_period_final      INTEGER NOT NULL DEFAULT 0,
  report_period_final_at   INTEGER,
  report_period_created_at INTEGER NOT NULL,
  report_period_updated_at INTEGER NOT NULL,
  report_period_sync_at    INTEGER,
  UNIQUE (report_period_kind, report_period_start)
) STRICT;

INSERT INTO report_periods_new (
  report_period_id, report_period_kind, report_period_start, report_period_end,
  report_period_final, report_period_final_at,
  report_period_created_at, report_period_updated_at, report_period_sync_at
)
SELECT
  'P:' || report_period_kind || ':' || report_period_start,
  report_period_kind, report_period_start, report_period_end,
  report_period_final, report_period_final_at,
  report_period_created_at, report_period_updated_at, NULL
FROM report_periods;

DROP TABLE report_periods;
ALTER TABLE report_periods_new RENAME TO report_periods;
