---
slug: cart-keyboard-untested-and-e2e-advisory
title: "The keyboard-first cart grid has no tests, e2e is advisory, and `src-tauri` is untested"
severity: medium
category: testing
iteration: 4
created: 2026-10-21T19:21:47.651Z
files:
  - "src/pages/Pos/Draft/z-Listing.tsx"
  - "src/components/cart/z-ListingCard.tsx"
  - ".github/workflows/windows-release.yml"
  - "src-tauri/src/printer.rs"
  - "src-tauri/src/auth.rs"
  - "src/pages/Setting/Data/RecordUpload/util-validate-record.test.ts"
---

# The keyboard-first cart grid has no tests, e2e is advisory, and `src-tauri` is untested

- **Severity:** medium
- **Category:** testing
- **Files:** `src/pages/Pos/Draft/z-Listing.tsx`, `src/components/cart/z-ListingCard.tsx`, `.github/workflows/windows-release.yml`, `src-tauri/src/printer.rs`, `src-tauri/src/auth.rs`, `src/pages/Setting/Data/RecordUpload/util-validate-record.test.ts`
- **Iteration:** 4

## Summary

The cart grid's keyboard/focus state machine — the most-modified and most-audited code in the repo, and now duplicated twice — has no tests under `src/pages/Pos` or `src/pages/Restock`, the e2e job that exercises one sale is `continue-on-error: true`, and `src-tauri` contains no `#[cfg(test)]` at all, so `validate_pdf` (the only place IPC-supplied bytes cross into Rust) and the bcrypt round-trip are compile-checked only. The service layer is well covered; the surface the cashier touches is not.

## Details

## Evidence

The suite is genuinely good where it reaches: 242 passing tests (`bun test`), including the previously flaky same-millisecond repricing (`src/services/product/live.test.ts`), submit→catalogue (`src/services/transaction/catalogue.test.ts`), the receipt builders (`src/lib/receipt/*.test.ts`), the import boundary (`src/services/record/import.test.ts`), the cart flush (`src/services/transaction/flush.test.ts`), and a checksum-pinned migration chain (`src/services/db/migration-chain.test.ts`). CI gates the MSI build on `typecheck`, `lint` and `bun test` (`.github/workflows/windows-release.yml`).

Three holes remain:

1. **The cart's keyboard/focus state machine has no tests at all.**
   `find src/pages/Pos src/pages/Restock -name '*.test.ts*'` → **no files**. Yet that is where nearly every finding of this audit series has lived (grid hand-off, focus gating, Tab past `Manual`, Enter on an underpaid amount, ArrowDown leaving the grid, the `Complete` dialog's `onCloseAutoFocus` suppression, parked tabs, F1/F2/F12). It is also the code that exists **twice** (`pos-restock-cart-duplication-fourth-audit`), so the only way to prove the two copies agree is a test that runs both. The e2e suite covers one happy-path sale (`f178e4c0`), nothing about keys.
2. **The e2e job cannot fail a release.** `.github/workflows/windows-release.yml`, `e2e` job: `continue-on-error: true`, commented "Non-blocking until the suite covers more than the happy-path sale". Combined with (1), the browser harness's only regression value is advisory.
3. **`src-tauri` has no tests.** The five Rust files contain no `#[cfg(test)]` module; `printer.rs::validate_pdf` (the one place user-supplied bytes cross the IPC boundary), `auth.rs` (bcrypt round-trip) and the release-only `prevent_default` plugin configuration are exercised only by compiling. `migration-checksums.json` is checked from TypeScript, which is a good trick worth keeping.

Also worth folding in rather than filing separately: the passing suite prints four `ZodError` stack traces from `src/pages/Setting/Data/RecordUpload`'s negative tests, because the Effect failure is logged before the test asserts on it. Green output that looks red trains people to ignore it.

## Why it matters

The project's own history is the argument: the last four audits filed ~ten findings against `src/pages/Pos` / `src/pages/Restock` / `src/components/cart`, and each fix was validated by reading the diff. A keyboard-first POS has a *behavioural contract* (F1 focuses search, arrows move, Tab leaves the grid, Enter pays, Esc cancels) that is cheap to assert with `@testing-library/react` and impossible to keep true by review — especially with two copies.

## Recommended fix

1. **Grid keyboard tests (highest value).** `src/components/cart/z-Listing.test.tsx` (or the merged component): render with three lines, fire `keydown` on the grid, assert `document.activeElement`, the `aria-activedescendant`, and the callbacks (`onLines`, `onExitDown`, `onToggle`). Cover: F1, ArrowDown past the last row, Tab past `Manual`, Enter committing an edit, Delete on a row, and the `focused={false}` case that must **not** steal focus. Run the same table for both modes once the components are merged.
2. **Make e2e blocking for the sale flow.** Split the job into a required `bun run test:e2e -g "sale"` (or keep the whole suite but drop `continue-on-error`) as soon as (1) exists; the harness already boots the real router against sql.js and applies the real migrations, which is exactly the coverage that catches a service-layer regression.
3. **Rust unit tests.** `#[cfg(test)]` in `printer.rs`: `validate_pdf` accepts `%PDF-1.7…` and rejects a short buffer and a non-PDF buffer with the user-facing Indonesian message (assert the message, because that is what the cashier reads). In `auth.rs`: hash/verify round-trip and a wrong password. These run in the existing `rust` CI job with no new infrastructure.
4. **Silence the expected failures.** Wrap the negative-case assertions in `util-validate-record.test.ts` so the expected `ZodError` is not logged (e.g. capture via `Effect.either` and assert on the `Left`, or lower the logger level for that test file).

## Acceptance criteria

- `bun test` includes component tests for the cart grid's keyboard map, and at least one asserts that a panel with `focused={false}` does not move focus.
- The e2e job is required (no `continue-on-error`) or a green named subset is.
- `cargo test --manifest-path src-tauri/Cargo.toml` runs at least the `validate_pdf` and bcrypt cases in CI.
- `bun test` output shows no unexpected stack traces.

## Verification

- `bun test` (new files, existing 242 unchanged).
- `bun run test:e2e`.
- `cargo test --manifest-path src-tauri/Cargo.toml` locally/CI (the Linux target is enough for `validate_pdf`).
- Deliberately break the ArrowDown routing in the grid and confirm a test fails — that is the check that the suite has teeth.
