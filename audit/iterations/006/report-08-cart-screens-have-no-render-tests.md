---
slug: cart-screens-have-no-render-tests
title: "The cart screens still have no render tests, so keyboard behaviour is only ever verified by reading"
severity: medium
category: testing
iteration: 6
created: 2026-10-21T20:21:58.224Z
files:
  - "src/components/cart/z-Extras.tsx"
  - "src/components/cart/z-ExtraSearch.tsx"
  - "src/components/cart/z-Listing.tsx"
  - "e2e/pos-cart.e2e.ts"
  - "bunfig.toml"
---

# The cart screens still have no render tests, so keyboard behaviour is only ever verified by reading

- **Severity:** medium
- **Category:** testing
- **Files:** `src/components/cart/z-Extras.tsx`, `src/components/cart/z-ExtraSearch.tsx`, `src/components/cart/z-Listing.tsx`, `e2e/pos-cart.e2e.ts`, `bunfig.toml`
- **Iteration:** 6

## Summary

285 unit tests, 39 files, clean tsc/lint, real e2e — but only three `*.test.tsx` exist against ~280 component files, and none of them renders a cart screen. The cart's tests are geometry-only, so the interaction bug filed this iteration (Enter in the extras search adding the first preset) passes the whole suite; it is the second money-path bug in two iterations that one render test would have caught.

## Details

## Evidence

The suite is healthy but it tests almost everything except a screen: `bun test` is 285
passing across 39 files, `tsc --noEmit` and `eslint` are clean, and the exist three
`*.test.tsx` files render a component:

- `src/components/FileDropZone.test.tsx`
- `src/pages/Record/z-Record/List.test.tsx`
- `src/pages/Restock/Draft/z-Kredit.test.tsx`

Against that, `find src -name "*.tsx"` returns ~280 files. The cart itself — 26 files in
`src/components/cart/`, ~6,100 lines, and the surface every sale goes through — has **no**
render test. Its tests are geometry-only (`listing-grid.test.ts`, `extra-grid.test.ts`,
`code-issues.test.ts`), which is why the interaction bug filed in this iteration (Enter in
the extras search adding `results[0]` instead of the highlighted preset —
`z-Extras.tsx:342-350` vs `z-ExtraSearch.tsx:41-45`) passes every existing test: no test
ever dispatches a key event through a rendered grid.

End-to-end coverage is 3 tests for the sale flow (`e2e/pos-cart.e2e.ts`: add a line, bump
the line, unknown query) plus 4 boot/login tests (`e2e/smoke.e2e.ts`). The harness is real
(the actual router, sql.js, the shipped migrations) and CI now runs it
(`.github/workflows/windows-release.yml`, `e2e` job), so the foundation is good — it simply
stops at "cart totals". Nothing exercises a dialog, a stage switch, F1/F2/F12, tabs,
parking/restoring, Batalkan, the credit dialog, or a keyboard grid on the shipped screens.

The two most valuable existing tests show the pattern that is missing elsewhere:
`z-Kredit.test.tsx` (a dialog that only broke because nothing rendered it) and
`List.test.tsx` (row keyboard model).

## Why it matters

The POS is a keyboard application whose rules live in event handlers and effects: which
element owns focus, whether a key is swallowed, whether a dialog closes, whether a write
lands once or twice. Those are exactly the failure modes that unit tests on pure geometry
cannot see and that manual QA catches only if the tester happens to pick the same key
sequence. The bug found this iteration is the second in two iterations that a single render
test would have caught (iteration 5's "credit dialog never closes" was the first), and both
were on the money path.

There is a second-order cost: because the cart has no render tests, every cart refactor in
the last three audits (grid merge, screen-hook extraction, extras catalog) had to be
verified by reading. That is why the shell duplication keeps recurring.

## Recommended fix

Add a small, targeted render-test layer over the cart — not a full coverage push:

1. `src/components/cart/z-Extras.test.tsx`: render `Extras` with two presets, type a
   query, ArrowDown, Enter → assert exactly one `onChange` with the *second* preset
   (this is the regression test for this iteration's bug). Then ArrowUp to exit, +manual,
   delete a row, Enter to edit a value.
2. `src/components/cart/z-Listing.test.tsx`: search → results → Enter adds a listing;
   Tab/ArrowRight out of the search; `+manual` creates a named-required line; Delete
   removes the selected card; `Escape` leaves an editor without committing.
3. `src/pages/Pos/page.test.tsx`: render the screen with the service layer stubbed the way
   `submit.test.ts` already does (`Layer.succeed(TransactionService, …)`), then assert
   F2 focuses a payment amount, F12 opens a second tab, Bayar with a negative change does
   nothing, and Batalkan re-opens the restored draft.
4. Extend `e2e/pos-cart.e2e.ts` by one scenario: F2 → type an amount → Bayar → the
   completion dialog appears → `Cetak` is blocked by the stubbed printer with an Indonesian
   message. That covers the whole commit path through the real services.
5. Keep the rule that made the existing tests useful: stub at the *service* boundary, never
   by mocking component internals.

## Acceptance criteria

- At least one render test per cart screen (`z-Listing`, `z-Extras`, `z-Methods`) that
  dispatches real key events and asserts the resulting service writes / props.
- The Enter-in-extras-search bug is covered by a test that fails on the pre-fix code.
- `Pos` is rendered once in a test with a stubbed service layer and asserts one full
  submit → completion-dialog transition.
- `bun test` stays green and the new tests do not need new configuration (the happy-dom +
  RTL preload in `bunfig.toml` already covers them).

## Verification

- `bun test src/components/cart` shows the new files.
- Revert the `defaultPrevented` guard in `z-Extras.tsx` locally and confirm the new test
  fails (then restore it — do not commit the revert).
- `bun run test:e2e` locally with the new scenario.
