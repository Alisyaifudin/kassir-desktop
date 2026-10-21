---
slug: pos-restock-cart-duplication
title: "The Pos and Restock carts are still the same ~6,000 lines written twice, now drifting both ways"
severity: high
category: maintainability
iteration: 2
created: 2026-10-21T18:12:54.915Z
files:
  - "src/pages/Pos/Draft/z-Methods.tsx"
  - "src/pages/Restock/Draft/z-Methods.tsx"
  - "src/pages/Pos/Draft/z-Listing.tsx"
  - "src/pages/Restock/Draft/z-Listing.tsx"
  - "src/pages/Pos/mock.ts"
  - "src/pages/Restock/types.ts"
  - "src/pages/_cart/z-Cell.tsx"
  - "src/pages/Pos/Draft/listing-grid.ts"
---

# The Pos and Restock carts are still the same ~6,000 lines written twice, now drifting both ways

- **Severity:** high
- **Category:** maintainability
- **Files:** `src/pages/Pos/Draft/z-Methods.tsx`, `src/pages/Restock/Draft/z-Methods.tsx`, `src/pages/Pos/Draft/z-Listing.tsx`, `src/pages/Restock/Draft/z-Listing.tsx`, `src/pages/Pos/mock.ts`, `src/pages/Restock/types.ts`, `src/pages/_cart/z-Cell.tsx`, `src/pages/Pos/Draft/listing-grid.ts`
- **Iteration:** 2

## Summary

Recurring (iteration 1, marked "partial"). The two cart screens are still one screen written twice: `git diff --no-index --stat` between `Pos/Draft` and `Restock/Draft` reports 658/525 changed lines out of 7,253, i.e. ~6,000 identical lines, and the types are duplicated too (`Pos/mock.ts` vs `Restock/types.ts`). The copies have now drifted in both directions — the Pos copy has the parked-cart flow, the `toggle` header cell and the panel hand-off; the Restock copy has none of it — so the same class of "fix reached one screen only" bug that iteration 1 caught is now built into the structure. The shared primitives also live under a page (`src/pages/_cart/`) and are imported across page folders (54 imports).

## Details

## Evidence

The Pos and Restock cart screens are still two copies of one screen. Measured in
this tree:

```
$ git diff --no-index --stat src/pages/Pos/Draft src/pages/Restock/Draft
 18 files changed, 658 insertions(+), 525 deletions(-)
```

against `7,253` lines total across the two trees — i.e. roughly **6,000 lines are
byte-identical**, and most of the remainder is a comment or a type-import path:

```
$ diff -u src/pages/Pos/Draft/z-Discount.tsx src/pages/Restock/Draft/z-Discount.tsx
-import type { DiscountKind, DiscountLine, Line } from "../mock";
+import type { DiscountKind, DiscountLine, Line } from "../types";
```

Same for `z-Extra.tsx`, `z-ExtraSearch.tsx`, `extra-grid.ts`, `listing-grid.ts`.
The two type modules are themselves copies:

```
$ diff -u src/pages/Pos/mock.ts src/pages/Restock/types.ts    # 10 changed lines, all comments
```

The duplicated surface is not trivial — it is the grid geometry
(`listing-grid.ts`, `extra-grid.ts`), the cell primitive caller
(`_cart/z-Cell`), the discount stack (`z-Discount.tsx`, 401 lines each), the
payments grid (`z-Methods.tsx`, 734/718 lines), the line cards
(`z-ListingCard.tsx`, 358/357) and the stage machine (`Draft/index.tsx`,
148/185).

**The copies have already drifted, in both directions:**

- Pos-only: the `toggle` header cell and the "Tambahan" total button
  (`src/pages/Pos/Draft/listing-grid.ts` `AnyField = Field | "search" | "manual" | "toggle" | "no" | "grip"`),
  the parked-cart store flow (`STORED_FLAG`, `z-Options.tsx`, `storeCart()` in
  `src/pages/Pos/page.tsx:267`), the down-hand-off to the settle strip
  (`focusBottom`/`onExitUp`, `z-Methods.tsx:155-162`), and the customer picker
  (`z-Customer.tsx`, 93 lines).
- Restock-only: `z-Supplier.tsx`, `z-Images.tsx` (119), `z-Kredit.tsx` (77) and
  its own separate `z-Payment.tsx` (163) instead of Pos's `z-Options.tsx`.

That asymmetry is the same failure iteration 1 reported from the other side
("the restock credit fix did not reach the POS copy"). It is now the POS copy
that has keyboard/UX work the Restock copy lacks: pressing `Down` on the last
cart row in Restock has no settle-strip hand-off, and `z-Tabs` there has no
parked-cart handling.

Second-order placement problem, same root cause: the genuinely shared cart
primitives live under a *page* — `src/pages/_cart/` (`z-Cell.tsx` 234 lines,
`z-SearchResults.tsx` 326, `code-issues.ts`, `util-rupiah.ts`, `run.ts`) — and two
pages import from there (`grep -rn "_cart" src` → 54 imports in `pages/Pos/**`
and `pages/Restock/**`). Per `.agent/agent.md`, reusable components belong in
`src/components/`, so a page-to-page import is a layer violation that also hides
the fact that this is shared UI. `src/pages/Pos/mock.ts` is production code with
a mock name (`EXTRA_PRESETS` is live, used by `Pos/Draft/z-Extras.tsx:113`).

## Why it matters

- Every cart/UX fix must be written twice or it silently diverges — measured, not
  hypothesised, above. The two screens are the highest-traffic surface in a POS
  and the most likely to change.
- ~6,000 duplicated lines is ~6,000 lines of review surface, and the file sizes
  (`z-Methods.tsx` 734 lines) are exactly what `.agent/agent.md` says to avoid.
- Reviewers cannot tell a real Pos/Restock behavioural difference from an
  oversight, so intended asymmetry (a purchase has a supplier, a sale does not)
  is not distinguishable from drift.

## Recommended fix

Two steps, in this order — do not attempt a big-bang merge:

1. **Extract the shared cart layer to `src/components/cart/`**: the grid geometry
   (`listing-grid`, `extra-grid`), `Cell`/`Issue`/`SearchResults`/`Precision`/
   `Note`, `code-issues`, `util-rupiah`, and the `Line`/`Extra`/`Discount` types
   (one module, not `mock.ts` + `types.ts`). Parameterise what actually differs
   with props: the money bearing field name/label ("Harga jual" vs "Harga beli"),
   the extra source (`EXTRA_PRESETS` vs `service.extra`), the header cell set
   (Pos's `toggle` cell), and the copy strings.
2. **Collapse the two `Draft/` trees into one `CartDraft` component** that takes
   a `mode: "incoming" | "outgoing"` plus slots for the mode-only panels
   (`z-Customer` for a sale, `z-Supplier`/`z-Images`/`z-Kredit` for a purchase).
   The page-level differences (`storeCart`, `focusBottom`, extra search source)
   stay in the page, passed in as props — they already are props today.

Keep the intent obvious: if a feature really is sale-only, it must be a named
slot or a `mode` branch, not a missing file.

## Acceptance criteria

- `src/pages/Pos/Draft/` and `src/pages/Restock/Draft/` are gone, replaced by one
  shared cart module; `git diff --no-index` between the two screens' remaining
  files shows only mode-specific slots (target: the two pages together are under
  ~600 lines, from ~1,730).
- `src/pages/_cart/` no longer exists; nothing under `src/pages/**` imports from
  another page folder.
- `rg "mock" src --glob '!**/*.test.*'` finds no production module.
- Pos keeps every behaviour it has today (F12 new tab, parked-cart chips, the
  `toggle` header cell, the down/up grid hand-off between panels, Ctrl+Arrow tab
  switching) and Restock gains the shared keyboard behaviour it now lacks.
- `bun test` and `bun run test:e2e` still pass; the e2e sale flow must be
  re-pointed at any renamed test ids, not deleted.

## Verification

```
rg -n "_cart|\.\./mock|\.\./types" src/pages
rg -n "STORED_FLAG|onToggle|focusBottom" src/pages        # one cart, mode-branched
bun run typecheck && bun run lint && bun test && bun run test:e2e
```

Manual pass, both screens: F1 search, `+manual`, qty arrows, discount dialog,
Enter on a code, Down from the last line, Ctrl+Arrow between tabs, and (Pos only)
F12 + the parked-chip flow.
