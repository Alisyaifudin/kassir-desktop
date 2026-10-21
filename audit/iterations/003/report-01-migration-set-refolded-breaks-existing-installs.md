---
slug: migration-set-refolded-breaks-existing-installs
title: "Migration 43 was re-folded and 44–50 deleted, so sqlx will reject every database already at v46"
severity: critical
category: tauri
iteration: 3
created: 2026-10-21T18:46:23.401Z
files:
  - "src-tauri/src/database/mod.rs"
  - "src-tauri/src/database/41-50/migration-43.sql"
  - "src-tauri/src/database/41-50/migration-46.sql"
  - "src-tauri/tauri.conf.json"
---

# Migration 43 was re-folded and 44–50 deleted, so sqlx will reject every database already at v46

- **Severity:** critical
- **Category:** tauri
- **Files:** `src-tauri/src/database/mod.rs`, `src-tauri/src/database/41-50/migration-43.sql`, `src-tauri/src/database/41-50/migration-46.sql`, `src-tauri/tauri.conf.json`
- **Iteration:** 3

## Summary

Commit `c3178d24` folded the post-42 migrations into `migration-43.sql` (+376 lines, so a different checksum) and deleted `44`, `45`, `47`, `48`, `49`, `50` from disk and from `generate_migration()`. The commit immediately before it (`b9bb5083`) had explicitly restored those files because, in its own words, \"sqlx fingerprints every migration it has applied, so a database already at 46 (the prod backup) cannot be served by a consolidated or renumbered set\". `tauri_plugin_sql` runs `sqlx::migrate::Migrator` on `sqlite:data.db` at preload time, and that migrator validates the applied set against the shipped set: a checksum change on 43 and six missing applied versions is a `VersionMismatch`/`VersionMissing` error, i.e. the POS cannot open its database after an update.

## Details

## Evidence

**What the ship list says today** — `src-tauri/src/database/mod.rs`:

```rust
        Migration {
            version: 42,
            ...
        },
        Migration {
            version: 43,
            description: "combined_schema_and_backfill",
            sql: include_str!("../../src/database/41-50/migration-43.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 46,
            description: "allow_webp_images",
            sql: include_str!("../../src/database/41-50/migration-46.sql"),
            kind: MigrationKind::Up,
        },
    ];
```
Lines 252–267. Versions 44, 45, 47, 48, 49 and 50 no longer exist.

**On disk** (`src-tauri/src/database/41-50/`): `migration-41.sql`, `migration-42.sql`, `migration-43.sql`, `migration-46.sql` — 44/45/47/48/49/50 are gone.

**Where they went** — `git show c3178d24 -- src-tauri/src/database/mod.rs` deletes the `44`, `45`, `47`, `48`, `49`, `50` `Migration { … }` blocks and renames 43 from `decompose_products_and_soft_delete` to `combined_schema_and_backfill`. The same commit rewrites the SQL:

```
$ git diff b9bb5083 HEAD --stat -- src-tauri/src/database
 src-tauri/src/database/41-50/migration-43.sql | 376 +++++++++++++++++++++++++-
 src-tauri/src/database/41-50/migration-43.sql | (680 lines before, 1052 after)
 src-tauri/src/database/41-50/migration-44.sql | 228 ----------------
 src-tauri/src/database/41-50/migration-45.sql |   8 -
 src-tauri/src/database/41-50/migration-47.sql |  61 -----
 src-tauri/src/database/41-50/migration-48.sql |   4 -
 src-tauri/src/database/41-50/migration-49.sql |   4 -
 src-tauri/src/database/41-50/migration-50.sql |  17 --
```

The one-commit-earlier fix says the danger out loud. From `git show b9bb5083`:

> "sqlx fingerprints every migration it has applied, so a database already at 46
> (the prod backup) cannot be served by a consolidated or renumbered set.
> Restore 43/44/46-49 exactly as those databases recorded them, keep 46 (the webp
> change prods applied) and add 45 as a no-op bridge so the versions are
> contiguous again."

And the old file header of 43 described the split that has now been undone:

> "The schema half of the reshaping. The data half — moving every row out of the
> parked `*_old` tables — is migration-44, so the two can be read, reviewed and
> retried separately. Both run in one pass when the app starts."

**How it is executed** — `src-tauri/src/lib.rs`:

```rust
    let database_migs = database::generate_migration();
    ...
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:data.db", database_migs)
                .build(),
        )
```
plus `src-tauri/tauri.conf.json` line 30: `"preload": ["sqlite:data.db", "sqlite:tx.db"]`.

`tauri-plugin-sql` builds a `sqlx::migrate::Migrator` from that vector and runs it on preload. sqlx compares the `_sqlx_migrations` rows in the existing file against the shipped set before applying anything: an applied version with a different checksum is `MigrateError::VersionMismatch(43, …)`; an applied version that is missing from the shipped set is `MigrateError::VersionMissing(44)` (45, 47, 48, 49, 50 likewise). Either one aborts the migration run, the plugin returns an error to the webview, and `services/db/live.ts` surfaces it as `Gagal memuat database: …` — every service that touches `data.db` fails, so the app is unusable, not merely stale.

This is not hypothetical for this repo: the message above records that a production database at version 46 exists. That database currently has no upgrade path through this build.

Secondary, same area: `sqlite:tx.db` is still preloaded although migration 43 creates the `tx_*` tables **inside `data.db`** (`tx_records`, `tx_listings`, `tx_extras`, `tx_methods`, `tx_discounts`, `tx_images` all live in `migration-43.sql`), and nothing in `src/` opens `sqlite:tx.db` any more. Every boot opens a second SQLite file that no code reads.

## Why it matters

This is the only finding in this audit that can stop the product from starting. A POS that will not open its database on a shop PC at opening time is worse than any data-display bug, and it is unrecoverable by the cashier: the fix requires someone technical to edit `_sqlx_migrations` or restore a backup. It also silently discards six migration files that the team had already (correctly) restored for exactly this reason one commit earlier, so the regression is a re-introduction of a known, documented invariant violation.

## Recommended fix

1. **Restore the shipped migration chain byte-for-byte**: bring back `migration-44.sql`, `migration-45.sql`, `migration-47.sql`, `migration-48.sql`, `migration-49.sql`, `migration-50.sql` with the exact bytes from `b9bb5083`, restore `migration-43.sql` to its `b9bb5083` content (680 lines, `decompose_products_and_soft_delete`), and re-add the six `Migration { … }` entries to `generate_migration()` in version order.
   `git show b9bb5083:src-tauri/src/database/41-50/<file>.sql > <file>` for each, then diff the whole directory against `b9bb5083` and expect an empty diff.
2. **Put the new schema work in a new, higher version** — the work that was folded into 43 (the `record_credit_at`/`record_created_at`/supplier snapshot columns, the `listing_code_kind` backfill, the live-only barcode index, the `tx_*` column additions) belongs in a fresh `migration-51.sql` registered as version 51. Never edit a file that has shipped.
3. **Add a guard so this cannot recur.** A unit test in `src-tauri` (or a plain `bun test`) that imports the version list and asserts it is contiguous from 1 to N is cheap; better, a `scripts/check-migrations.ts` that pins a SHA-256 per shipped migration file and fails `bun run typecheck`/CI when one changes.
4. **Drop `sqlite:tx.db` from `plugins.sql.preload`** in `tauri.conf.json` — the cart lives in `data.db` now, so the second connection is dead weight and a second file to keep consistent.
5. Document the rule where the next agent will read it: append-only, monotonically increasing migration versions; existing files are immutable.

## Acceptance criteria

- `ls src-tauri/src/database/41-50/` contains `migration-41 … migration-51` (contiguous, no gaps), and `git diff b9bb5083 -- src-tauri/src/database/41-50/migration-4{3,4,6,7,8,9}.sql` is empty.
- `generate_migration()` returns versions 1..=N with no gaps and no reordering; the new schema changes live in version 51+.
- A migration checksum test (or script) exists and fails when a shipped file is edited.
- `plugins.sql.preload` lists only `sqlite:data.db`.
- Smoke check performed against the real production backup shape: a `data.db` whose `_sqlx_migrations` contains versions up to 46 opens and reaches 51 without `VersionMismatch`/`VersionMissing`.

## Verification

- `git show b9bb5083:src-tauri/src/database/41-50/migration-43.sql | sha256sum` equals `sha256sum src-tauri/src/database/41-50/migration-43.sql`.
- `grep -c 'version:' src-tauri/src/database/mod.rs` matches the number of `.sql` files in `src-tauri/src/database/*/`, and `cargo check --manifest-path src-tauri/Cargo.toml` still compiles (all `include_str!` targets exist).
- Reproduce the bug before the fix if a v46 fixture exists: copy the prod `data.db` into a dev appdata dir, `bun run tauri:dev`, and confirm the current build reports a migration error while the restored chain opens it.
