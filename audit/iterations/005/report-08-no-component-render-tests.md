---
slug: no-component-render-tests
title: "The RTL/happy-dom harness is preloaded but nothing renders a component, so the whole UI flow layer is untested"
severity: medium
category: testing
iteration: 5
created: 2026-10-21T19:54:41.785Z
files:
  - "bunfig.toml"
  - "test/happydom.ts"
  - "test/testing-library.ts"
  - "src/components/cart/listing-grid.test.ts"
  - "e2e/pos-cart.e2e.ts"
  - "e2e/smoke.e2e.ts"
---

# The RTL/happy-dom harness is preloaded but nothing renders a component, so the whole UI flow layer is untested

- **Severity:** medium
- **Category:** testing
- **Files:** `bunfig.toml`, `test/happydom.ts`, `test/testing-library.ts`, `src/components/cart/listing-grid.test.ts`, `e2e/pos-cart.e2e.ts`, `e2e/smoke.e2e.ts`
- **Iteration:** 5

## Summary

happy-dom, React Testing Library, jest-dom matchers and an `afterEach(cleanup)` are all preloaded in `bunfig.toml`, yet there is not one `*.test.tsx` in the repo: 263 unit tests cover services, SQL and grid *geometry*, and 7 Playwright tests cover login plus Pos search, but no test ever renders a component. Restock (including the credit submit), `Complete`'s exits, `unsubmit`, Records and both imports have no automated cover at all — which is why this iteration's stale-dialog bug shipped.

## Details

## Evidence

The render harness is wired and unused.

`bunfig.toml`:

```toml
[test]
preload = ["./test/happydom.ts", "./test/testing-library.ts"]
```

`test/happydom.ts` registers happy-dom globally; `test/testing-library.ts`
extends `expect` with `@testing-library/jest-dom` matchers and calls `cleanup()`
after each test. Every dependency a React render test needs is installed
(`@testing-library/react`, `@testing-library/dom`, `@happy-dom/global-registrator`).

There are **no component tests**:

```
$ find src test e2e -name '*.test.tsx' | wc -l
0
```

All 35 test files are `.test.ts`, and `bun test` reports 263 passing assertions
across services, SQL builders, receipt builders, grid *geometry*, and pure
utilities. Nothing under `src/components/**/*.tsx` or `src/pages/**/page.tsx` is
ever rendered. The closest thing is `src/components/ui/icon-buttons.test.ts`,
which greps the source text for `aria-label`.

The browser-side coverage is 7 Playwright tests in two files —
`e2e/smoke.e2e.ts` (4: first-run, login screen, sign-in, wrong password) and
`e2e/pos-cart.e2e.ts` (3: add a listing and total it, bump an existing line, empty
search). There is **no** e2e for: Restock at all (including the credit submit
added in `ac34fb44`), submitting a sale to a record, the `Complete` dialog's three
exits, `unsubmit`, receipt printing, Records, Utang, Money, or either import.

This is not theoretical: iteration 5's first finding — the `Kredit` confirmation
surviving a successful submit — sits in exactly the hole. Its logic is three
`useState` calls and one `await`; a 15-line render test would have caught it, and
the geometry tests that *were* written (`listing-grid.test.ts`,
`extra-grid.test.ts`) cannot.

## Why it matters

The service layer is genuinely well covered — `submit.test.ts` is 1,370 lines and
asserts FIFO lot draining, capital allocation, credit dates, code collisions and
post-commit refresh failure. That makes the *untested* layer the interesting one:
the 4.8k lines under `src/components/cart/` plus the ~800 lines of Pos/Restock
page shell are the code that decides which cart is active, which cell owns the
selection, when a dialog closes, and which exit from `Complete` runs. Those are
exactly the interactions a user reports as "it did something weird after Bayar",
and they have zero automated cover.

The gap also has a cost the fixer already paid once: the iteration-4 fix note says
the DOM-level grid test "did not land" because the merged grid subscribes to live
services and needs a mock seam. That seam is a `Layer` substitution —
`src/services/index.ts` already supports `globalThis.__KASSIR_SERVICE__` injection
for the e2e harness, and `src/services/db/test-support.ts` exists. The seam is
mostly built; only the wiring into a test file is missing.

## Recommended fix

1. Add the missing seam for tests: a `test/service.ts` that builds an `AppService`
   from a fake `DatabaseService` (reuse `src/services/db/test-support.ts`) and
   `vi`-style injection into `globalThis.__KASSIR_SERVICE__` before importing the
   component, mirroring what `src/e2e/main.tsx` does for the browser harness.
2. Write the four render tests that pay for themselves first:
   - `Restock`/`Payment`: a credit submit that resolves `null` closes the dialog
     and never leaves two `[role=dialog]` nodes (finding #1);
   - `Complete`: each of `Batalkan` / `Lihat detail` / `Cetak` / X calls the right
     callback and `Batalkan` restores the draft;
   - `Listing` (the merged grid): `ArrowDown` off the last row calls `onExitDown`,
     `focused={false}` does **not** steal focus;
   - `Methods`: Enter on an underpaid amount keeps the editor open on a sale and
     closes it on a purchase (the divergence the iteration-3 report called out).
3. Add one e2e for the Restock happy path (add a line → F2 → pay → receipt) so a
   whole purchase is exercised against the real schema, the way `pos-cart.e2e.ts`
   does for sales.
4. Keep the suite honest: a CI step that fails when a new `.tsx` under
   `src/pages/**` or `src/components/cart/**` has no render test *is* too rigid —
   instead gate on coverage for `src/components/cart/**` and
   `src/pages/{Pos,Restock}/**`.

## Acceptance criteria

- At least one test file renders a component (`*.test.tsx`), using the already
  preloaded happy-dom + RTL setup with no new configuration.
- The `Kredit`-survives-submit regression has a test that fails on the current
  code and passes after the fix.
- `Methods`' sale-vs-purchase Enter divergence is pinned by a test.
- `e2e/restock.e2e.ts` exists and passes in the blocking Playwright job.

## Verification

- `bun test` shows the new `*.test.tsx` files passing, and `git stash`-ing the
  `Kredit` fix makes exactly one of them red.
- `bunx playwright test` includes the Restock spec and stays green with
  `workers: 2` (the setting added in `582fe596`).
- `rg --files -g '*.test.tsx' src` returns ≥ 3 files.
