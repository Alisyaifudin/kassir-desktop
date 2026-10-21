---
slug: pos-restock-duplication
title: "Two live copies (plus two dead ones) of the POS cart screen diverge on every fix"
severity: high
category: maintainability
iteration: 1
created: 2026-10-21T17:30:26.095Z
files:
  - "src/pages/Pos/Draft/z-Methods.tsx"
  - "src/pages/Restock/Draft/z-Methods.tsx"
  - "src/pages/Pos/Draft/z-Listing.tsx"
  - "src/pages/Restock/Draft/z-Listing.tsx"
  - "src/pages/Shop"
  - "src/pages/Stock-PENDING"
  - "src/route.tsx"
---

# Two live copies (plus two dead ones) of the POS cart screen diverge on every fix

- **Severity:** high
- **Category:** maintainability
- **Files:** `src/pages/Pos/Draft/z-Methods.tsx`, `src/pages/Restock/Draft/z-Methods.tsx`, `src/pages/Pos/Draft/z-Listing.tsx`, `src/pages/Restock/Draft/z-Listing.tsx`, `src/pages/Shop`, `src/pages/Stock-PENDING`, `src/route.tsx`
- **Iteration:** 1

## Summary

`/pos` and `/restock` are two hand-maintained copies of the same cart screen (~3,800 duplicated lines in `Draft/` alone, plus duplicated shells), and the most recent commit fixed a credit-failure bug in only one of them. Two further dead copies (`pages/Shop`, `pages/Stock-PENDING`, ~8,000 lines) still compile and are the ones a newcomer is most likely to edit.

## Details

## Evidence

Two routed screens are near-copies of each other, file by file:

| file | `src/pages/Pos/Draft` | `src/pages/Restock/Draft` |
|---|---|---|
| `z-Discount.tsx` | 401 | 401 |
| `z-Methods.tsx` | 734 | 718 |
| `z-Listing.tsx` | 609 | 544 |
| `z-Extras.tsx` | 491 | 441 |
| `z-ListingCard.tsx` | 357 | 356 |
| `z-SearchResults.tsx` | 326 | 326 |
| `z-Cell.tsx` | 234 | 234 |
| `z-Extra.tsx` / `z-ExtraSearch.tsx` / `z-Issue.tsx` / `z-Note.tsx` / `z-Precision.tsx` | 185/85/39/41/41 | 185/85/39/41/41 |
| `z-Tabs.tsx` | 185 | 147 |

That is roughly **3,800 lines duplicated**, on top of ~1,200 duplicated lines in the page shells (`page.tsx`, `z-Bottom.tsx` 212, `z-Complete.tsx` 183, `use-draft.ts`, `use-stage.ts`, `util-rupiah.ts`, `code-issues.ts`). `listing-grid.ts` and `extra-grid.ts` are two more copies.

Both screens are real routes: `src/route.tsx` imports `posRoute` and `restockRoute` and registers both.

The duplication is already diverging, and the last commit demonstrates the cost directly:

```
be5e8d72 fix(restock): show credit failures in the dialog and keep split methods
```

The same defect exists in `Pos` and was not fixed in the same commit; `Restock/Draft/z-Kredit.tsx`, `z-Payment.tsx`, `z-Images.tsx`, `z-Supplier.tsx` have no `Pos` counterpart and vice-versa (`Pos/Draft/z-Customer.tsx`, `z-Options.tsx`, `z-Total.tsx`), so the two screens no longer share a shape either.

On top of that, `src/pages/Shop/` (~4,000 lines) and `src/pages/Stock-PENDING/` (~4,000 lines) are **two more** generations of the same screen. `Shop` is commented out of the router (`// import { shopRoute } from "./pages/Shop";`, `// shopRoute,` in `src/route.tsx`) and `Stock-PENDING` is not routed at all — but both still compile, both still import removed modules, and both still show up in `rg`/editor navigation when someone searches for "discount" or "cart".

## Why it matters

- Every POS behaviour (keyboard grid, discount stacking, credit flow, printing, receipt) must be implemented twice and verified twice. The git history shows the second copy already falling behind.
- `Pos/Draft/z-Methods.tsx` (734 lines) and `z-Listing.tsx` (609) are the most safety-critical code in the app (money, payment kinds, submit gate) and they are the hardest to reason about, in two places.
- New contributors routinely edit the dead `Shop` copy (it has the most "natural" names — `pages/Shop/z-Right/Product/...`), and the file it edits is not in any route.
- The four copies inflate typecheck time and hide the live errors (see the build report).

## Recommended fix

1. Extract the shared cart machinery once: `src/pages/_cart/` (or `src/components/cart/`) holding `listing-grid.ts`, `extra-grid.ts`, `z-Cell`, `z-Listing`, `z-ListingCard`, `z-Discount`, `z-Methods`, `z-Tabs`, `z-SearchResults`, parameterised by `mode: "incoming" | "outgoing"` and by the small set of genuinely different panel pieces (`z-Supplier`, `z-Customer`, `z-Kredit`, `z-Images`). `Reload` the difference list from the table above; it is short.
2. Delete `src/pages/Shop/` and `src/pages/Stock-PENDING/` outright (they are not routed and reference deleted modules) plus the `// shopRoute` / `// analRoute` comment lines in `src/route.tsx` if Analytics/Shop are abandoned.
3. Add a `rg` guard in CI: no imports of `~/database`, `~/store`, `~/server`, `~/transaction`, `~/middleware` (see the dead-code report), which mechanically prevents the next stale copy from lingering.

## Acceptance criteria

- Exactly one implementation of the cart grid / methods / discount components, consumed by both `/pos` and `/restock` with a `mode` prop.
- `src/pages/Shop` and `src/pages/Stock-PENDING` no longer exist.
- A shared-component change (e.g. the credit-failure dialog) is provably visible in both screens with one edit.
- `wc -l` for the cart UI stops growing while both screens keep their current features.

## Verification

- `bun run dev`; walk the restock and sale flows end to end (F1/F2/F12, add line, discount, multi-method, credit, complete) on both screens.
- `rg -n "shopRoute|Stock-PENDING" src` returns nothing outside git history.
- Introduce one deliberate bug in the shared `z-Methods` and confirm both screens show it (proving there is a single implementation).
