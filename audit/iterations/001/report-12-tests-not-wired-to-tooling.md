---
slug: tests-not-wired-to-tooling
title: "19 unit suites and a new e2e harness that no script or CI job ever runs"
severity: medium
category: testing
iteration: 1
created: 2026-10-21T17:32:31.748Z
files:
  - "package.json"
  - ".github/workflows/windows-release.yml"
  - "playwright.config.ts"
  - "e2e"
  - "src/services/transaction/submit.test.ts"
  - "src/services/record/credit.test.ts"
---

# 19 unit suites and a new e2e harness that no script or CI job ever runs

- **Severity:** medium
- **Category:** testing
- **Files:** `package.json`, `.github/workflows/windows-release.yml`, `playwright.config.ts`, `e2e`, `src/services/transaction/submit.test.ts`, `src/services/record/credit.test.ts`
- **Iteration:** 1

## Summary

There are 19 solid `bun test` suites and a new sql.js-backed Playwright harness, but `package.json` has no `test` script and CI runs neither tests, lint, nor typecheck before building the installer. The three highest-risk paths found in this audit — cart flush failure, catalogue invalidation, credit receipt — have no coverage at all, and e2e covers only the happy-path sale.

## Details

## Evidence

There are 19 real unit test files with meaningful coverage of the money/stock domain:

```
src/services/transaction/submit.test.ts     src/services/record/{credit,mode,capital,draft}.test.ts
src/services/product/stock-sql.test.ts      src/services/db/transaction.test.ts
src/lib/search/{listings,stocks}.test.ts    src/pages/Pos/Draft/code-issues.test.ts
src/pages/Restock/Draft/code-issues.test.ts src/pages/{Debt,Method,Record,Product}/**.test.ts
src/pages/Money/History/with-diff.test.ts   src/pages/Record/Item/z-Detail/discounts.test.ts
```

and a new in-browser e2e harness (`e2e/*.e2e.ts`, `src/e2e/{main,sqljs,store-browser,tauri-shim}.ts`, `playwright.config.ts`) that runs the real router against sql.js with the real migrations — genuinely good infrastructure.

But **nothing runs them**:

```json
// package.json scripts
"dev": "vite",
"build": "tsc && vite build",
"preview": "vite preview",
"tauri": "tauri",
"tauri:dev": "tauri dev --config src-tauri/tauri.dev.conf.json",
"test:e2e": "playwright test",
"lint": "eslint .",
"lint:fix": "eslint . --fix",
"audit:loop": "...", "audit:once": "..."
```

- No `test` script for the `bun test` suites (the runner is implied by `"types": ["bun-types"]` and by `code-issues.test.ts`'s sibling duplicated per screen, plus `playwright.config.ts`'s comment: *"`.e2e.ts`, not `.spec.ts`: `bun test` globs `*.spec.*`"*).
- `.github/workflows/windows-release.yml` runs `bun install` → `tauri-action`. No lint, no typecheck, no unit tests, no e2e.
- The single e2e spec covers the happy-path sale (`e2e/*.e2e.ts` — "cover the sale flow from search to cart total"). Nothing covers credit/utang submission, cart restore/store, delete-record stock restoration, receipt printing, the product form, or the money ledger.
- The two highest-risk paths found in this audit have **zero** coverage: whole-draft cart persistence failure (`transaction/live.ts:369`) and catalogue cache invalidation (`listing/live.ts`), plus the credit-receipt crash (`build-header.ts:31`). `submit.test.ts` is 1,281+ lines and tests `submit`, not `flush` or `refresh`.

## Why it matters

- The test suite is the project's best asset and it is not wired to anything; a red test today is indistinguishable from a green one. The build is already red (`tsc`), which proves the same culture point.
- Domain rules that must never regress — discount stacking order, percent extras, `roundMoney`, credit vs paid dates, stock depletion across lots — are *tested*, so the risk is purely operational: the tests stop running the moment someone refactors and forgets `bun test` locally.
- The one e2e flow exercises sale only, so a regression in restock (which shares no code — see the duplication report) or in credit (the last commit's subject!) would ship.

## Recommended fix

1. Add `"test": "bun test"`, `"test:watch": "bun test --watch"`, and `"typecheck": "tsc --noEmit"` to `package.json`; make `test` exclude `e2e/**` (already `.e2e.ts`).
2. Add a CI job (or a first step in `windows-release.yml`) running `bun run typecheck && bun run lint && bun test`. Keep `playwright` as a separate, non-blocking job until it is stable.
3. Cover the three uncovered high-risk paths:
   - cart flush failure surfaces an error and keeps the draft (fake `DatabaseService` that fails once),
   - catalogue cache reflects a product mutation and a sale without reload,
   - `generatePdfBytes` with `paidAt: null` and with an empty social list.
4. Add one e2e spec for the credit flow (Restock credit failure was this iteration's fix — it deserves a test) and one for storing/restoring a cart.

## Acceptance criteria

- `bun run test` runs the 19 suites and exits 0 from a clean clone.
- CI fails on a red unit test, red lint, or red typecheck before it tries to build the installer.
- The three high-risk paths above each have a named failing-first test.
- `bun run test:e2e` covers sale **and** credit **and** cart restore.

## Verification

- Delete an assertion in `submit.test.ts`, run CI → red.
- `bun test` locally → all suites pass, none silently skipped (`bun test --reporter=junit` shows counts).
- `bun run test:e2e` → both flows green against sql.js.
