---
slug: dead-legacy-trees-under-src
title: "~10k lines of unrouted legacy code under `src/` that imports deleted modules"
severity: medium
category: architecture
iteration: 1
created: 2026-10-21T17:30:38.743Z
files:
  - "src/lib/sync"
  - "src/pages/Shop"
  - "src/pages/Stock-PENDING"
  - "src/pages/Analytics"
  - "src/pages/Setting/Sync_PENDING"
  - "src/hooks/use-get-products.ts"
  - "src/route.tsx"
  - "src-tauri/src/api/mod.rs"
  - "src-tauri/Cargo.toml"
---

# ~10k lines of unrouted legacy code under `src/` that imports deleted modules

- **Severity:** medium
- **Category:** architecture
- **Files:** `src/lib/sync`, `src/pages/Shop`, `src/pages/Stock-PENDING`, `src/pages/Analytics`, `src/pages/Setting/Sync_PENDING`, `src/hooks/use-get-products.ts`, `src/route.tsx`, `src-tauri/src/api/mod.rs`, `src-tauri/Cargo.toml`
- **Iteration:** 1

## Summary

`src/lib/sync`, `src/pages/Shop`, `src/pages/Stock-PENDING`, `src/pages/Analytics`, `src/pages/Setting/Sync_PENDING` and two hooks are unrouted legacy code (~10k lines) importing modules that no longer exist (`~/database`, `~/store`, `~/server`, `~/transaction`, `~/middleware`). They are most of the typecheck failure, they mislead edits, and the Rust twin `src-tauri/src/api/` is dead too but still pulls axum/sqlx/tokio into `Cargo.toml`.

## Details

## Evidence

Large legacy trees still live under `src/` (not `src-old/`) and import modules that no longer exist:

```
src/lib/sync/{grave,method,product,product-event,record,program.ts}  → ~/database, ~/store, ~/server/*
src/pages/Shop/**            (≈4,000 lines)                          → ~/database/product/cache, ~/transaction, ~/hooks/use-get-methods
src/pages/Stock-PENDING/**   (≈4,000 lines)                          → ~/transaction, ~/database, ~/middleware
src/pages/Analytics/**                                               → ~/database, ~/database/product/get-all-by-range
src/pages/Setting/Sync_PENDING/**                                    → ~/store, ~/middleware/admin
src/hooks/use-get-products.ts, src/hooks/use-product-search.tsx      → ~/database/product/cache
```

None of those modules exist:

```
$ ls src
assets components e2e global.css hooks layouts lib main.tsx pages route.tsx services vite-env.d.ts
```

and `src/route.tsx` shows the corresponding routes are disabled:

```ts
// import { shopRoute } from "./pages/Shop";
// import { analRoute } from "./pages/Analytics";
…
// shopRoute,
// analRoute,
```

The project's own plan already says to delete them — `src/services/PLAN.md:427`:

> Delete `src/database`, old `src/lib/sync`, `src/lib/result.ts`, `graves` code.

`~lib/result.ts` is still shipped-and-imported by ~30 files, including live pages: `src/pages/Shop/z-Right/Extra/z-Search/index.tsx:5` is dead, but `src/pages/Record/Search/page.tsx` was migrated, while `src/pages/Debt/page.tsx:6`, `src/pages/Setting/Printer/z-Settings.tsx:2`, `src/pages/Money/History/z-TableList.tsx` still use the legacy `use-data`/`Result` model.

## Why it matters

- **The typecheck cannot be made green without removing them.** 90% of the `tsc` output is these trees; the two real errors in live code are buried (see the build report).
- **They are a trap.** `pages/Shop/z-Right/Product/…` is the most discoverable name for "the cart product panel", but editing it changes nothing at runtime. Two of the last five fixes in this repo touch cart code; the next one will land in the wrong directory eventually.
- **They hide the real architecture.** The `services` layer, the `Loader/useStream/useMutation` model and the `Effect` boundaries are the actual design, and they are surrounded by ~10,000 lines of a superseded design that still imports `db`/`tx` directly.
- Bundle hygiene is fine (Vite treeshakes unreachable modules) — the cost is human and tooling, not bytes.

## Recommended fix

1. Delete in one mechanical commit: `src/lib/sync/`, `src/pages/Shop/`, `src/pages/Stock-PENDING/`, `src/pages/Analytics/`, `src/pages/Setting/Sync_PENDING/`, `src/hooks/use-get-products.ts`, `src/hooks/use-product-search.tsx`, `src/pages/Shop/store/`, `src/pages/Stock-PENDING/store/`.
2. Then check what remains of `src/lib/result.ts` + the `use-data.ts` files that only legacy pages consume and migrate or delete them (Debt, Setting/Printer, Money/History, Record/Search are on `src/components/Loader` already — confirm and drop the old helper).
3. Remove the commented-out route imports in `src/route.tsx` so the routing table is the full truth.
4. Guard the boundary in CI:
   ```
   rg -n 'from "~/(database|store|server|transaction|middleware)' src && exit 1
   ```
5. Also delete the dead Rust twin: `src-tauri/src/api/{mod,product,session,sql}.rs` is not declared in `lib.rs` (`mod auth; mod database; mod jwt; mod printer;`) and still queries a schema that no longer exists (`SELECT * FROM products WHERE updated_at > $1`, `cashiers.hash`). With it go `axum`, `tower`, `tower-http`, `futures`, `tokio`, `sqlx` from `src-tauri/Cargo.toml` unless something else uses them.

## Acceptance criteria

- `rg -n "from \"~/(database|store|server|transaction|middleware)\"" src` returns nothing.
- `src/pages` contains only routes reachable from `src/route.tsx`.
- `cargo build --release` succeeds with the dead `api` module removed and the axum/tower/sqlx dependencies dropped (or a documented reason each one stays).
- `tsc --noEmit` error count drops to zero (with the live fixes from the build report).

## Verification

- `git rm -r src/lib/sync src/pages/Shop src/pages/Stock-PENDING src/pages/Analytics src/pages/Setting/Sync_PENDING src/hooks/use-get-products.ts src/hooks/use-product-search.tsx` then `npx tsc --noEmit` → fewer errors, none new.
- `bun run dev` and click every Topbar nav entry + every Setting card; all routes still render.
- `cargo check` in `src-tauri` after removing `src/api/`.
