---
slug: records-date-range-queries-unindexed
title: "Record history, dashboard and debt all full-scan `records` because nothing indexes the record date"
severity: medium
category: performance
iteration: 4
created: 2026-10-21T19:20:16.150Z
files:
  - "src/services/record/live.ts"
  - "src-tauri/src/database/mod.rs"
  - "src-tauri/src/database/51-60/migration-51.sql"
  - "src-tauri/src/database/migration-checksums.json"
---

# Record history, dashboard and debt all full-scan `records` because nothing indexes the record date

- **Severity:** medium
- **Category:** performance
- **Files:** `src/services/record/live.ts`, `src-tauri/src/database/mod.rs`, `src-tauri/src/database/51-60/migration-51.sql`, `src-tauri/src/database/migration-checksums.json`
- **Iteration:** 4

## Summary

Every record read — history list, day summary, debt table, comprehensive listing search — filters and orders on `COALESCE(record_paid_at, record_credit_at, record_created_at)`, and no migration indexes `records` at all. The file itself notes the table is "~64k rows, always read by range", so each of those screens is a full scan plus temp-B-tree sort over the entire sales history that degrades every trading day; the fix is one append-only migration with an expression index.

## Details

## Evidence

Every record read filters and sorts on a `COALESCE` expression over three columns, and no migration creates an index on any of them.

`src/services/record/live.ts:221-235` — the file states the scale itself:

```ts
// Records are a queried domain: ~64k rows, always read by range, so they get
// query Effects plus a `revision` counter instead of a full-list `SubscriptionRef`.
const RECORD_DATE = "COALESCE(record_paid_at, record_credit_at, record_created_at)";

const SELECT_SUMMARY = `
  ...
  FROM records
  WHERE record_deleted_at IS NULL
    AND ${RECORD_DATE} >= $1 AND ${RECORD_DATE} < $2
  GROUP BY record_mode`;
```

The same predicate is repeated in:
- `src/services/record/live.ts:285-301` (`SELECT_LISTING_HISTORY`) — filters both sides of the range **and** `ORDER BY` the same expression;
- the `byRange` query (~lines 288-300 of the same file);
- `src/services/record/live.ts:375-380` (the debt table): `WHERE record_credit_at IS NOT NULL AND record_paid_at IS NULL AND record_deleted_at IS NULL ORDER BY record_credit_at DESC`.

`rg 'CREATE INDEX' src-tauri/src/database` returns indexes on `product_events`, `record_methods`, `record_listings`, `discounts`, `record_images`, `stocks`, `listings`, `properties`, `product_names` and the `tx_*` cart tables — **not one index on `records`.** The newest migration re-creates the whole table and then adds indexes only for the child tables (`src-tauri/src/database/51-60/migration-51.sql:216-236`, "Indexes. They are created only now…"), and `CREATE TABLE records` there (`:46-65`) declares no index-worthy constraint beyond the primary key.

Even a plain index on `record_paid_at` would not help: SQLite cannot use a single-column index for `COALESCE(a, b, c)`, so the full table scan is structural, not just missing.

## Why it matters

The Record list, the Home dashboard's day summary, the Debt table, the Product performance screen and the comprehensive listing search all read `records` by range. On a 64k-row table each of those is a **full scan plus a full sort** of the whole sales history, and it gets slower every trading day — the classic "the app was fast in year one" POS failure. The pragma is cheap to check:

```
EXPLAIN QUERY PLAN SELECT ... FROM records WHERE COALESCE(...) >= ? AND COALESCE(...) < ?
→ SCAN records USING TEMP B-TREE FOR ORDER BY
```

The fix is one append-only migration, so it costs nothing in risk terms. It is also the only remaining performance item in this audit; the search path and the per-keystroke grid work are already benchmarked (`src/lib/search/listings.test.ts` scores 5,000 listings inside the typing budget).

## Recommended fix

Add `src-tauri/src/database/51-60/migration-52.sql` (**never edit 01–51** — their bytes are fingerprinted by `src/services/db/migration-chain.test.ts`) with expression/partial indexes:

```sql
-- The date a record belongs to, the same expression every read filters on.
CREATE INDEX record_date_idx
  ON records (COALESCE(record_paid_at, record_credit_at, record_created_at));

-- The open-credit table: small, hot, and cheap to keep partial.
CREATE INDEX record_credit_open_idx
  ON records (record_credit_at)
  WHERE record_paid_at IS NULL AND record_deleted_at IS NULL;

-- Live rows only: every read adds this predicate.
CREATE INDEX record_live_idx
  ON records (record_mode)
  WHERE record_deleted_at IS NULL;
```

Then register `version: 52, description: "index_record_dates"` in `generate_migration()` (`src-tauri/src/database/mod.rs`), add its checksum to `src-tauri/src/database/migration-checksums.json`, and (optionally, but preferred) drop the redundant `record_live_idx` if `EXPLAIN QUERY PLAN` shows the date index is chosen anyway — measure, do not guess.

If splitting the date columns is acceptable later, the deeper fix is a stored `record_date` column maintained by the writers, so the index is a plain integer column — but the expression index is enough for now and needs no write-path change.

## Acceptance criteria

- `EXPLAIN QUERY PLAN` for `byRange`, `SELECT_SUMMARY`, `SELECT_LISTING_HISTORY` and `debt()` shows `USING INDEX record_date_idx` (or `USING INDEX record_credit_open_idx` for the debt query) and no `SCAN records`.
- `migration-52.sql` is registered and checksum-pinned; `bun test src/services/db/migration-chain.test.ts` passes and files 01–51 are byte-unchanged.
- A test seeds ~5k records and asserts the day-range read stays within a wall-clock budget (the pattern already exists in `src/lib/search/listings.test.ts`).

## Verification

- `bun test` (all 242 existing tests must stay green; the in-browser SQLite harness applies the real migrations, so a syntax error in 52 fails the suite).
- `bun test src/services/db/migration-chain.test.ts`.
- On a copy of a real `data.db`: `sqlite3 data.db "EXPLAIN QUERY PLAN ..."` before/after, and time the Record page for the current day.
