---
slug: pos-restock-cart-duplication-fourth-audit
title: "Pos and Restock are still the same cart written twice, and the copies have diverged in the keyboard grid"
severity: high
category: architecture
iteration: 4
created: 2026-10-21T19:19:47.470Z
files:
  - "src/pages/Pos/Draft/z-Listing.tsx"
  - "src/pages/Pos/Draft/z-Extras.tsx"
  - "src/pages/Restock/Draft/z-Listing.tsx"
  - "src/pages/Restock/Draft/z-Extras.tsx"
  - "src/pages/Pos/Draft/z-Tabs.tsx"
  - "src/pages/Restock/Draft/z-Tabs.tsx"
  - "src/pages/Pos/Draft/extra-grid.ts"
  - "src/pages/Pos/Draft/listing-grid.ts"
  - "src/pages/Pos/use-draft.ts"
  - "src/pages/Pos/use-stage.ts"
  - "src/pages/Pos/page.tsx"
  - "src/pages/Restock/page.tsx"
---

# Pos and Restock are still the same cart written twice, and the copies have diverged in the keyboard grid

- **Severity:** high
- **Category:** architecture
- **Files:** `src/pages/Pos/Draft/z-Listing.tsx`, `src/pages/Pos/Draft/z-Extras.tsx`, `src/pages/Restock/Draft/z-Listing.tsx`, `src/pages/Restock/Draft/z-Extras.tsx`, `src/pages/Pos/Draft/z-Tabs.tsx`, `src/pages/Restock/Draft/z-Tabs.tsx`, `src/pages/Pos/Draft/extra-grid.ts`, `src/pages/Pos/Draft/listing-grid.ts`, `src/pages/Pos/use-draft.ts`, `src/pages/Pos/use-stage.ts`, `src/pages/Pos/page.tsx`, `src/pages/Restock/page.tsx`
- **Iteration:** 4

## Summary

Recurring (4th audit): ~4,200 lines of cart UI still exist as two copies, and the copies are now behaviourally asymmetric — the stage-toggle column, the ArrowDown hand-off out of the grid, the `focused` gate on the focus effect and the parked-cart tab render exist only in the Pos copy. Every keyboard/focus fix of the last three iterations landed in one file and not the other, so the same bug will be re-found here again unless the grid itself is merged into `src/components/cart/` the way `z-Methods` already was.

## Details

## Evidence

`diff -rq src/pages/Pos src/pages/Restock` — twelve file pairs are near-copies, and three of them (`Draft/z-Extra.tsx`, `use-draft.ts`, `use-stage.ts`) are still byte-identical. The Pos half alone is 2,236 lines:

```
185  src/pages/Pos/Draft/z-Extra.tsx      (identical to Restock's)
 33  src/pages/Pos/use-draft.ts           (identical)
 26  src/pages/Pos/use-stage.ts           (identical)
 83  src/pages/Pos/Draft/extra-grid.ts    (near-copy)
110  src/pages/Pos/Draft/listing-grid.ts  (near-copy)
492  src/pages/Pos/Draft/z-Extras.tsx     (near-copy, ~440 of 492 shared)
665  src/pages/Pos/Draft/z-Listing.tsx    (near-copy, ~560 of 665 shared)
194  src/pages/Pos/Draft/z-Tabs.tsx       (near-copy)
414  src/pages/Pos/page.tsx               (near-copy)
```

So roughly **4,200 lines of cart UI exist as two copies** — the fourth audit in a row that finds this. Iteration 3's partial fix moved the safest pieces into `src/components/cart/` (`z-Methods.tsx` 734 lines now exists once, plus `z-Cell`, `z-Discount`, `z-Note`, `z-Precision`, `z-Total`, `z-Issue`, `z-SearchResults`, `code-issues`, `run.ts`). The two files that hold the **keyboard state machine** were not moved, and they are the ones that keep drifting:

1. **Stage toggle column** — only in Pos. `Pos/Draft/z-Listing.tsx` has `const MANUAL_COLUMN = 8; const TOGGLE_COLUMN = 10;` plus a `cell-header-toggle` button that switches to the extras stage from inside the grid (`onToggle`). `Restock/Draft/z-Listing.tsx` has `const MANUAL_COLUMN = 10;` and no toggle cell at all, so the same gesture (Tab/ArrowRight past `Manual`) does nothing on the purchase screen.
2. **ArrowDown off the last row** — Pos: `if (!moveVertical(1)) onExitDown();` (`Pos/Draft/z-Listing.tsx:477-490`) hands the selection to the settle strip. Restock: `moveVertical(1);` and `moveVertical` returns `void` instead of `boolean` — Down on the last line silently stops. Same in `z-Extras.tsx` (Pos routes `onExitDown`, Restock drops it).
3. **Focus ownership** — Pos gates the focus effect on `focused` (`Pos/Draft/z-Listing.tsx:168-172`, `Pos/Draft/z-Extras.tsx:126-131`): "Only the panel that owns the selection may take focus." Restock's copies (`Restock/Draft/z-Listing.tsx:153-157`, `Restock/Draft/z-Extras.tsx:133-137`) have no `focused` concept and no `onActivate`. Today that is benign only because Restock's payment panel is a separate stage rather than a sibling panel; the moment anyone adds a strip to Restock the two grids will fight for focus.
4. **Tab strip** — `Pos/Draft/z-Tabs.tsx` renders a parked cart as a collapsed number (`if ((draft.flag & STORED_FLAG) !== 0)`, ~40 lines) and imports `STORED_FLAG`; the Restock copy has no stored-flag branch and no `z-Options.tsx`, so parking does not exist there.
5. **Extras catalogue** — Restock reads `service.extra.get.changes`, Pos reads `EXTRA_PRESETS` (filed separately as `pos-extras-search-ignores-extra-service`).

## Why it matters

The reported cost is not aesthetics, it is that **every keyboard/focus fix lands in one copy**. The Pos grid hand-off, the `Complete` dialog focus suppression, the parked-carts gesture and the ArrowDown routing were all fixed in the Pos files only; the Restock files are the pre-fix snapshots. That is a permanent tax: the same bug will be re-found here in iteration 5 unless the copies are merged, and reviewers cannot tell "different on purpose" from "different by omission" because the diffs are 500 lines of near-identical JSX.

## Recommended fix

Finish the extraction Iteration 3 started, cheapest-first:

1. `Draft/extra-grid.ts` + `Draft/listing-grid.ts` (83 + 110 lines, pure modules, no React) → one `src/components/cart/extra-grid.ts` / `listing-grid.ts`. Mechanical, no design decisions.
2. `Draft/z-Listing.tsx` → `src/components/cart/z-Listing.tsx` with the three real differences as props: `priceLabel` (`"Harga Jual"` / `"Harga Beli"`), `stageToggle?: { label, total }` (present on Pos, absent on Restock), and `extraTotal`/`focused`/`onToggle`/`onExitDown`/`onActivate` already being props. Take the **Pos** copy as the base — it is the fixed one — and add the optional toggle.
3. Same for `z-Extras.tsx`; the `Subtotal Barang` row and the service-fed presets stay as Restock does them, the toggle column as Pos does.
4. `z-Tabs.tsx` → one component with `onStore?: () => void`; when absent the parked-cart branch and `Options` render nothing.
5. `use-draft.ts` / `use-stage.ts` (byte-identical, 59 lines) → `src/pages/cart/use-draft.ts` / `use-stage.ts`, or lift the mode into the hook.
6. `page.tsx` last: the two screens genuinely differ (Pos has a settle strip and parking, Restock has three stages and a credit action). Extract the shared parts (`findLineIssues` wiring, the no-tabs auto-create effect, the `?draft=` repair, the Ctrl+Arrow tab walk) into `src/pages/cart/use-cart-screen.ts` and leave ~120 lines of page-specific composition on each side.

## Acceptance criteria

- One implementation of the line grid and the extras grid, parameterised by mode; `src/pages/Pos/Draft/z-Listing.tsx` and `src/pages/Restock/Draft/z-Listing.tsx` are gone (or are 20-line wrappers passing props).
- The keyboard map (F1, arrows, Tab, Enter, Delete, Ctrl+Arrow tab walk) has a single source and a test that runs for both modes; see the testing report.
- Restock gains the stage-toggle cell and the ArrowDown hand-off (behaviour parity), or a comment states why it does not.
- `wc -l src/pages/Pos src/pages/Restock` drops by at least ~2,500 lines total.
- `bun test`, `bun run typecheck`, `bun run lint` green; the e2e sale flow still passes.

## Verification

- `bun test` (submit/catalogue/flush tests must stay green — they touch the transaction service, not these components).
- `bun run test:e2e` (the sale flow from search to cart total).
- Manual pass on both screens: F1 search, arrows through the grid, Tab past `Manual`, `Bayar`, and the same gestures on `/restock`.
