-- ============================================================================
-- migration-63   Financial report: categories, classifications, period closure.
-- ============================================================================
-- The report in `REPORT.md`. It adds one thing the schema cannot derive — *what a
-- line means in accounting terms* — and nothing else.
--
-- Why it is not derived
-- --------------------
-- `analytics/scope.sql` already answers "which records a report is about" and
-- "which day each belongs to", and every money figure in the app comes from it.
-- What it cannot answer is whether a line called `Ongkir` is a shipping charge or
-- something the shop names Ongkir, because `record_extras.record_extra_name` is a
-- free-text snapshot with no link to the catalogue, and
-- `record_listings.product_id` is nullable with a free `record_listing_name`
-- beside it. That judgement is the operator's, so it is stored.
--
-- Why no totals are stored
-- ------------------------
-- A stored total goes stale the moment a record from that day is edited, a credit
-- settles onto a later date, or a sync merge lands. Everything in the report body
-- is recomputed from `records` + `report_lines` on every open. The period row
-- records only *that a report exists* and *that a period was closed* — never what
-- it said. Drift is detected, not frozen: `report_line_source_rev` holds the
-- record's `record_updated_at` as it stood at classification time, so a mismatch
-- at read time means "this record changed after you classified it".
--
-- Conventions, as in `migration-43`
-- ---------------------------------
--   * Column naming `<singular_table>_<field>`; the singular of `report_categories`
--     is `report_category`.
--   * `STRICT`, millisecond integers, money as REAL.
--   * Soft delete is `<singular>_deleted_at`. Categories are soft-deleted and
--     never hard-deleted: an old report must still be able to name the category it
--     used.
--   * No sync trio. These tables are local config and local judgement, like
--     `pockets` — see REPORT.md §10.3. They are not part of any synced aggregate.
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- 1. `report_categories` — Beli, Jual, Diskon, PPN, Admin, Ongkir, and whatever
--    the shop adds (`Penyesuaian`, …).
--
--    `report_category_slug` is the stable handle the app compares against; the id
--    is only a key. A category can be renamed (`Beli` → `Pembelian`) without every
--    query having to learn the new spelling, and the built-ins can be recognised
--    without matching on a display string that a shop is free to edit.
-- ----------------------------------------------------------------------------
CREATE TABLE report_categories (
  report_category_id         TEXT PRIMARY KEY,
  report_category_name       TEXT NOT NULL UNIQUE,
  report_category_slug       TEXT NOT NULL UNIQUE,
  -- 1 for the six seeded below: they cannot be deleted while `report_lines`
  -- reference them, and the report has a fixed meaning for each.
  report_category_builtin    INTEGER NOT NULL DEFAULT 0,
  report_category_order      INTEGER NOT NULL DEFAULT 0,
  report_category_deleted_at INTEGER
) STRICT;

-- ----------------------------------------------------------------------------
-- 2. `report_lines` — the classification. One row per classified line.
--
--    The line is the natural key, not the report: a line belongs to exactly one
--    record, and a record to exactly one day, so the day a classification belongs
--    to is derived. Nothing is stored twice, so a weekly report cannot classify a
--    line differently from the daily one containing it.
--
--    Which id a *listing line* is keyed by is the one non-obvious thing here.
--    `record_listings` holds one row per lot portion, and the line the operator
--    sees is the group those portions belong to: `RecordListing.id` in
--    `src/services/record/live.ts` is `record_listing_group_id`, not a
--    `record_listing_id`. The group id is minted once per entered line
--    (`generateId()`, same file), so it is unique across the database and is the
--    only stable identity a line has. Keying on a portion id would classify one
--    arbitrary piece of a line that happened to draw from two stock lots.
--
--    `record_listing_group_id` therefore carries `UNIQUE` (one classification per
--    line) but *no* foreign key: no table has it as a primary key, so there is
--    nothing to point at. `record_id` supplies the integrity instead — it cascades
--    on a real DELETE, and it saves every report aggregate a join it would
--    otherwise make through `record_listings`.
--
--    `record_id` is a deliberate denormalization, the same one
--    `product_events.product_id` carries: a report read always needs the record,
--    and deriving it per row from two different parents would be two joins in
--    every aggregate.
--
--    Exactly one of the two line identities is set (`CHECK`), and both are
--    `UNIQUE` — with SQLite's rule that NULLs are distinct, that reads as "at most
--    one row per line", which is the invariant the classifier's upsert relies on.
--
--    A mode flip (`migration-61`) mints new group ids along with the new record, so
--    a flipped record loses its classifications. That is correct: the flip writes a
--    different record and deletes the old one.
--
--    `ON DELETE CASCADE` fires only on a real DELETE. Records are soft-deleted
--    (`record_deleted_at`), which leaves the FK untouched — so undeleting a record
--    finds its classifications exactly as they were, and a report from the day it
--    belongs to needs no re-work.
--
--    No `report_line_updated_at`: `report_line_at` is when the operator decided,
--    and the record's own `record_updated_at` (snapshotted into
--    `report_line_source_rev`) is when the *facts* last moved. A second timestamp
--    here would be a third answer to the same question.
-- ----------------------------------------------------------------------------
CREATE TABLE report_lines (
  report_line_id          TEXT PRIMARY KEY,
  -- The record: cascade on a real DELETE, and one join for every aggregate.
  record_id               TEXT NOT NULL REFERENCES records(record_id) ON DELETE CASCADE,
  -- A listing line, by the group the operator entered. No FK points here — see
  -- above; `record_id` is what holds the line to its record.
  record_listing_group_id TEXT UNIQUE,
  -- An extra line. An extra has no portions, so its own id is already the line.
  record_extra_id         TEXT UNIQUE REFERENCES record_extras(record_extra_id) ON DELETE CASCADE,
  report_category_id      TEXT NOT NULL REFERENCES report_categories(report_category_id),
  -- `records.record_updated_at` at classification time. Read against the record's
  -- current value: equal means "unchanged since you decided", different means the
  -- report shows `berubah` and the day is no longer final.
  report_line_source_rev INTEGER NOT NULL,
  -- 1 when the category was filled in for the operator (the mode default, or a
  -- remembered extra name) and 0 when they chose it. Not used for correctness; it
  -- is what the cell renders subdued vs solid, and it is the input to the next
  -- day's suggestion.
  report_line_auto       INTEGER NOT NULL,
  report_line_at         INTEGER NOT NULL,
  CHECK ((record_listing_group_id IS NULL) <> (record_extra_id IS NULL))
) STRICT;

-- The `UNIQUE` constraints above already index each line identity, which is what
-- the "still unclassified?" probes seek on. This one is the other direction: the
-- report's own GROUP BY category, and the guard that refuses to soft-delete a
-- category that past reports still name.
CREATE INDEX report_line_category_idx ON report_lines (report_category_id);

-- No index is needed on the other half of that join: `record_listing_group_idx ON
-- record_listings (record_listing_group_id)` already exists from `migration-43`,
-- put there for regroupListings. The report joins exactly the pair it covers.

-- ----------------------------------------------------------------------------
-- 3. `report_periods` — closure, not content.
--
--    A row's *existence* is "there is a report for this range", which is what the
--    screen's empty state reads: `Buat laporan` inserts it (`final = 0`) in the
--    same transaction that seeds the defaults. `final = 1` is written only by
--    `closePeriod`, for week / month / quarter / year — a day never needs closing,
--    because a day is complete exactly when its lines are classified.
--
--    `report_period_start`/`_end` are the half-open local midnights the kind
--    resolves to (`src/services/report/period.ts`), not values the caller invents:
--    they are stored so a closed period can be pointed at by the range it closed
--    even if the calendar rules ever change.
-- ----------------------------------------------------------------------------
CREATE TABLE report_periods (
  report_period_id         TEXT PRIMARY KEY,
  report_period_kind       TEXT NOT NULL CHECK (report_period_kind IN
                             ('day', 'week', 'month', 'quarter', 'year')),
  report_period_start      INTEGER NOT NULL,
  report_period_end        INTEGER NOT NULL,
  report_period_final      INTEGER NOT NULL DEFAULT 0,
  report_period_final_at   INTEGER,
  report_period_created_at INTEGER NOT NULL,
  report_period_updated_at INTEGER NOT NULL,
  UNIQUE (report_period_kind, report_period_start)
) STRICT;

-- ----------------------------------------------------------------------------
-- 4. The six built-in categories.
--
--    Ids come from `upper(hex(randomblob(13)))` — 26 characters, the length
--    `ulid()` mints in `src/lib/random.ts`, so nothing downstream has to care that
--    these three rows were written by a migration rather than by the app. The same
--    trick `migration-61` uses for the keys it had to invent.
--
--    `Diskon` is seeded for hand-typed lines only. A *listing's* discount already
--    lives in the `discounts` table (`kind`/`value`/`eff` per line), and the report
--    reads it from there — categorising it as well would count it twice.
-- ----------------------------------------------------------------------------
INSERT INTO report_categories (
  report_category_id, report_category_name, report_category_slug,
  report_category_builtin, report_category_order
)
SELECT upper(hex(randomblob(13))), name, slug, 1, ord
  FROM (
            SELECT 'Beli'   AS name, 'beli'   AS slug, 0 AS ord
  UNION ALL SELECT 'Jual',         'jual',         1
  UNION ALL SELECT 'Diskon',       'diskon',       2
  UNION ALL SELECT 'PPN',          'ppn',          3
  UNION ALL SELECT 'Admin',        'admin',        4
  UNION ALL SELECT 'Ongkir',       'ongkir',       5
  );
