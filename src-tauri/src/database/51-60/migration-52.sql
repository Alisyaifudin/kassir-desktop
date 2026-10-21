-- ----------------------------------------------------------------------------
-- Index the record date.
--
-- Every record read filters — and most of them order — on the same expression,
-- `COALESCE(record_paid_at, record_credit_at, record_created_at)`: the history
-- list, the dashboard's day summary, the comprehensive listing search and the
-- debt table. Nothing indexed `records` at all, and SQLite cannot use a
-- single-column index for a `COALESCE` expression, so each of those screens was a
-- full scan plus a temp B-tree sort over the whole sales history — a cost that
-- grows every trading day on a table the app already expects to hold ~64k rows.
--
-- Append-only: migrations 01-51 are byte-fingerprinted by
-- `src/services/db/migration-chain.test.ts`, so the fix arrives as a new version.
-- ----------------------------------------------------------------------------

-- The date a record belongs to, for the range reads (`byRange`, the day summary,
-- the listing history). Partial on the predicate every read adds, so the index
-- only carries live rows.
CREATE INDEX record_date_idx
  ON records (COALESCE(record_paid_at, record_credit_at, record_created_at))
  WHERE record_deleted_at IS NULL;

-- The open-credit list (Money > Debt): outstanding rows only, newest first.
CREATE INDEX record_credit_open_idx
  ON records (record_credit_at)
  WHERE record_paid_at IS NULL AND record_deleted_at IS NULL;
