---
slug: receipt-money-rust-untested
title: "The receipt builders, the money journal and all of `src-tauri` are untested, and no test covers submit→catalogue"
severity: medium
category: testing
iteration: 2
created: 2026-10-21T18:15:03.845Z
files:
  - "src/lib/receipt/build-summary.ts"
  - "src/lib/receipt/create-receipt-data.ts"
  - "src/services/money/live.ts"
  - "src/services/transaction/submit.test.ts"
  - "src/services/db/test-support.ts"
  - ".github/workflows/windows-release.yml"
---

# The receipt builders, the money journal and all of `src-tauri` are untested, and no test covers submit→catalogue

- **Severity:** medium
- **Category:** testing
- **Files:** `src/lib/receipt/build-summary.ts`, `src/lib/receipt/create-receipt-data.ts`, `src/services/money/live.ts`, `src/services/transaction/submit.test.ts`, `src/services/db/test-support.ts`, `.github/workflows/windows-release.yml`
- **Iteration:** 2

## Summary

Recurring in part (iteration 1's `tests-not-wired-to-tooling` is fixed — CI now runs typecheck/lint/test). What remains is coverage shape: the receipt builders (`src/lib/receipt/*`, only `build-header` tested) and the money journal (`src/services/money/live.ts`, 382 lines, no test) are untested, which is exactly where this iteration's negative-rounding receipt bug lives. There are also zero Rust tests and no `cargo check`/`clippy` step, so `src-tauri` is only compiled at release time, and no test asserts the composite "a committed sale changes the price/stock the POS reads" that iteration 1 was about.

## Details

## Evidence

Iteration 1's wiring work landed: `package.json` has `typecheck`/`test`/`test:e2e`,
and `.github/workflows/windows-release.yml` runs `bun run typecheck`,
`bun run lint`, `bun test` before `tauri-action`, plus a non-blocking e2e job.
The suite itself is real — 22 files / 198 tests, and the money-critical paths are
genuinely covered: `services/transaction/submit.test.ts` (63 cases: FIFO lots,
split payments, negative rounding, unit conversion, manual-code collisions),
`services/record/draft.test.ts`, `credit.test.ts`, `capital.test.ts`,
`listing/live.test.ts`, `product/stock-sql.test.ts`.

The holes are specific and they are on the money-printed-to-paper path:

1. **`src/lib/receipt/` is one test file.** `ls src/lib/receipt` → `build-header.test.ts`
   only. Untested: `build-summary.ts` (which number appears on which line —
   Total / Pembulatan / Total Semua / Pembayaran / Kembalian), `extras-text-data.ts`,
   `product-text-data.ts`, `build-transaction-summary.ts`, `build-footer.ts`,
   `create-receipt-data.ts` (the section order and the `paperWidth` layout).
   Report 3 in this iteration (negative rounding drops the rounding and grand-total
   lines) lives exactly in that unguarded file and would not have survived a single
   summary test.
2. **`src/services/money/live.ts` (382 lines) has no test at all** — `ls
   src/services/money` → `index.ts`, `live.ts`. This is the cash/bank journal: the
   pocket balance derivation that the Money screen and `with-diff.ts` display. The
   only money-page test is `pages/Money/History/with-diff.test.ts`, which tests the
   row-diff helper, not the balances the service computes.
3. **The print pipeline is untested end to end**: `src/lib/printer.ts`,
   `pages/Setting/Printer/util-program-print.ts`,
   `pages/Record/Item/z-Receipt/program-print-receipt.ts`,
   `pages/Setting/Printer/mock-data.ts`. The PDF bytes and the text lines handed to
   the printer are the customer-facing artefact; nothing asserts that what is sent
   equals `createReceiptData(record, width)`.
4. **Zero Rust tests** — `rg "#\[test\]" src-tauri/src` returns nothing — and CI has
   no `cargo clippy`/`cargo test`/`cargo check` step. `src-tauri/src/printer.rs` and
   `database/mod.rs` (41 `include_str!` migrations) only compile as a side effect of
   `tauri-action` on a Windows runner, so a Rust type error is discovered at release
   time, several minutes into the MSI build.
5. **No test links a committed sale back to the catalogue**: `submit.test.ts`
   asserts the write, `product/live.test.ts` asserts identity reuse, and
   `listing/live.test.ts` asserts projection — but nothing asserts the composite
   that iteration 1 was about: *after* `transaction.submit`, `listing.get.all()`
   shows the reduced stock and the price of the day. That missing composite is why
   the wall-clock invalidation bug (report 1) had to be caught by a flaky test
   instead of a direct one.

## Why it matters

The suite's centre of gravity is right (services, stock, money arithmetic) and the
remaining gaps cluster where the app talks to paper and to the ledger — the two
places an error is expensive and invisible on screen. Report 3 is not hypothetical:
the untested file already contains a guard bug that prints a wrong receipt. A red
or flaky gate is also how a suite stops being trusted (see report 1).

## Recommended fix

Add, in this order (each is small and local):

1. `src/lib/receipt/build-summary.test.ts` — assert the full ordered set of
   `TextData` rows for: no extras, extras, positive rounding, negative rounding,
   zero rounding, and a pay/change mismatch. This is the highest-value test in the
   repo per line written.
2. `src/lib/receipt/create-receipt-data.test.ts` — the section order and the
   `paperWidth` plumbing (a snapshot of the emitted lines is fine here).
3. `src/services/money/live.test.ts` against `makeTestDatabase()`
   (`src/services/db/test-support.ts` already runs the real migrations): balance
   after a deposit/withdraw, a transfer between pockets, a delete, and the
   `withDiff` input the History page consumes.
4. One composite test in `src/services/transaction/`: seed a product, submit a
   sale, then read `product.get.byId` **and** `listing.get.all()` in the same
   tick — assert stock and price. This is the regression lock for report 1.
5. `.github/workflows/windows-release.yml`: a `cargo fmt --check` +
   `cargo clippy -- -D warnings` step in a separate job (Linux runner is fine for
   `cargo check` of the non-Windows `platform` module; Windows for the full one).
6. Leave the e2e job non-blocking only while it covers a single happy path; add the
   "sale reduces stock on the POS card" flow (seed → sell → reopen POS) and then
   make the job blocking.

## Acceptance criteria

- `src/lib/receipt/` has tests for every `build-*.ts` and for
  `create-receipt-data.ts`; a deliberately broken money line in
  `build-summary.ts` makes a test fail.
- `src/services/money/live.ts` has a test file covering balance derivation,
  transfer and delete, run through `makeTestDatabase()`.
- A transaction-level test asserts post-commit catalogue state (stock + price) in
  the same tick, and it fails if the `hydrate()` identity check is reverted to
  pure timestamp comparison.
- CI runs a Rust job (`cargo check` at minimum) that fails in under two minutes on a
  Rust type error.

## Verification

```
bun test
bun test src/lib/receipt src/services/money src/services/transaction
bun run typecheck
```

Mutation check: temporarily invert the rounding guard in `build-summary.ts` and
confirm `bun test src/lib/receipt` fails; revert.
