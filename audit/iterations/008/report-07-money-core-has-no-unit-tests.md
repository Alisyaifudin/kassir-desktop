---
slug: money-core-has-no-unit-tests
title: "The shared money core (`src/lib/purchase.ts`) has no unit test of its own, and the discount/rounding edge cases are unpinned"
severity: medium
category: testing
iteration: 8
created: 2026-10-21T21:09:54.387Z
files:
  - "src/lib/purchase.ts"
  - "src/services/transaction/submit.test.ts"
  - "src/services/record/round.ts"
  - "src/pages/Record/Item/z-Detail/discounts.test.ts"
---

# The shared money core (`src/lib/purchase.ts`) has no unit test of its own, and the discount/rounding edge cases are unpinned

- **Severity:** medium
- **Category:** testing
- **Files:** `src/lib/purchase.ts`, `src/services/transaction/submit.test.ts`, `src/services/record/round.ts`, `src/pages/Record/Item/z-Detail/discounts.test.ts`
- **Iteration:** 8

## Summary

`src/lib/purchase.ts` — the shared money core behind both cart screens, the receipt and the commit path (14 importers) — is the only pure module of its class with no test file of its own. The submit suite imports `recalcDiscounts` only as a fixture builder and asserts stored rows at `fix: 2` with valid inputs, so discount stacking order, over-discount handling, negative extras, the `fix` clamp in `roundMoney` and the half-rounding direction are all unpinned. Both money defects found this iteration are one small unit test away from being caught.

## Details

## Evidence

`src/lib/purchase.ts` is the money core: `lineSubtotal`, `lineGrandTotal`, `lineDiscountTotal`, `recalcDiscounts`, `linesSubtotal`, `recalcExtras`, `extrasTotal`, `purchaseTotal`, `transactionGrandTotal`, `paidTotal`, `roundMoney`. Fourteen modules import it:

```
src/pages/Pos/page.tsx                    src/pages/Restock/page.tsx
src/pages/Pos/Draft/index.tsx             src/pages/Restock/Draft/index.tsx
src/pages/Restock/Draft/z-Payment.tsx     src/services/transaction/live.ts
src/services/record/live.ts               src/components/cart/z-Discount.tsx
src/components/cart/z-Listing.tsx         src/components/cart/z-ListingCard.tsx
src/components/cart/z-Extras.tsx          src/components/cart/z-Methods.tsx
```

There is no `src/lib/purchase.test.ts`. The file's functions are only ever exercised *through* other tests, with fixed, valid inputs:

- `src/services/transaction/submit.test.ts:4` imports `recalcDiscounts` and uses it as a **fixture builder** (`discounts: recalcDiscounts(price, qty, [...])`), never asserts on it.
- The submit suite covers happy values at `fix: 2` only ("rounds pay and the grand total at fix 2 while storing full line precision", "supports a pcs discount", "compounds percent extras in order", "supports negative rounding").
- `src/pages/Record/Item/z-Detail/discounts.test.ts` tests the *rendering* of stored discounts (`rupiah`, `extraAmount`, running totals), not the derivation.

Untested behaviours that matter and are cheap to assert:

| function | untested edge |
|---|---|
| `recalcDiscounts` | a `number` or `pcs` discount larger than the line (report 01 — this is the bug it would have caught) |
| `recalcDiscounts` | percent applied to the *running* total vs the subtotal (order-dependence is the whole design) |
| `recalcDiscounts` | re-derivation after a price change (report 02) |
| `lineGrandTotal` | a discount stack that reaches or passes zero |
| `recalcExtras` / `extrasTotal` | flat negative extras, percents applied to a running total, order permutations |
| `roundMoney` | `fix` out of range / non-integer (`Number.isInteger(fix) && fix <= 100 ? … : 0`) and `.5`-boundary rounding on a Decimal (JDK vs JS rounding) |
| `paidTotal` | split methods summing across floats |

Coverage is otherwise genuinely good — 364 tests, 49 files, render tests dispatching real key events for the cart, and statement-count tests for the narrow-refresh work — which makes this gap conspicuous: the single most consequential pure module in the app is the only one of its peers (`utils.ts`, `search/listings.ts`, `receipt/*`, `record/capital.ts`, `product/stock-sql.ts`, `record/validate-line.ts`) without a test file.

## Why it matters

- **It is the module where the money bugs live.** Two of this iteration's findings (an over-discount creating a negative sale, and a stale `eff` after a price edit) are both visible from a ten-line unit test on `recalcDiscounts`, and neither is caught by any current test because every existing caller passes a discount that fits.
- **The submit suite cannot see the arithmetic.** It asserts stored rows, at one `fix`, with fixtures built by the same function under test — so a regression inside `recalcDiscounts` would move both expected and actual numbers and stay green.
- **`roundMoney`/`roundToFix` are the rounding contract** for pay, change and the printed receipt; a change there breaks the "Pembulatan" line on real paper and there is no test that pins it at a half.

## Recommended fix

Add `src/lib/purchase.test.ts` (pure, no layers, runs in milliseconds) covering at minimum:

1. `lineSubtotal` / `lineGrandTotal` / `lineDiscountTotal` — one line, no discount; one percent; stacked `number` + `percent`; `pcs`.
2. `recalcDiscounts` — order dependence of two percents (10% then 10% ≠ 20%); `eff`/`total` for a running stack; the **over-discount** case (`number` > subtotal, `pcs` > qty) with whatever the chosen contract is (clamped or reported as an issue, per report 01).
3. `recalcExtras` / `extrasTotal` — flat negative (a deduction), percent of the running total, two percents in both orders.
4. `roundMoney` — `fix` 0/2/4, `fix: -1` and `fix: 101` falling back to 0, and a `.5` boundary (e.g. `new Decimal("2.5")` at `fix: 0`) pinned to the value `record.roundToFix` uses.
5. `paidTotal` — two split methods with decimals (no float drift).

Then make the screens/test suites use the tested helpers rather than re-deriving: `submit.test.ts`'s fixtures can call `recalcDiscounts` but should assert against literal expectations at least once.

## Acceptance criteria

- `src/lib/purchase.test.ts` exists, ≥ 20 assertions, and fails if any of the report-01/report-02 behaviours regress.
- Every exported function in `src/lib/purchase.ts` is referenced by at least one test.
- The rounding contract is pinned: a test asserts `roundMoney(new Decimal("2.5"), 0)` and `roundMoney(new Decimal(value), fix)` for a value where `.toFixed` rounding direction matters, and `record/round.ts`'s `roundToFix` agrees (one test may import both).
- `bun test` remains green and fast (no new timers or DOM needed).

## Verification

- `bun test src/lib/purchase.test.ts` and confirm the over-discount cases fail before the fix in report 01 and pass after.
- `bun test` overall count increases by the new cases; `bunx tsc --noEmit` and `bunx eslint .` stay clean.
