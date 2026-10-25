---
slug: pos-restock-cart-verbatim-duplication
title: "Pos and Restock are still the same 5,100-line cart written twice, now with behavioural drift"
severity: high
category: architecture
iteration: 3
created: 2026-10-21T18:46:42.512Z
files:
  - "src/pages/Pos/Draft/z-Methods.tsx"
  - "src/pages/Restock/Draft/z-Methods.tsx"
  - "src/pages/Pos/Draft/z-ListingCard.tsx"
  - "src/pages/Restock/Draft/z-ListingCard.tsx"
  - "src/pages/Pos/Draft/z-Listing.tsx"
  - "src/pages/Restock/Draft/z-Listing.tsx"
  - "src/pages/Pos/Draft/z-Extras.tsx"
  - "src/pages/Restock/Draft/z-Extras.tsx"
  - "src/pages/Pos/page.tsx"
  - "src/pages/Restock/page.tsx"
---

# Pos and Restock are still the same 5,100-line cart written twice, now with behavioural drift

- **Severity:** high
- **Category:** architecture
- **Files:** `src/pages/Pos/Draft/z-Methods.tsx`, `src/pages/Restock/Draft/z-Methods.tsx`, `src/pages/Pos/Draft/z-ListingCard.tsx`, `src/pages/Restock/Draft/z-ListingCard.tsx`, `src/pages/Pos/Draft/z-Listing.tsx`, `src/pages/Restock/Draft/z-Listing.tsx`, `src/pages/Pos/Draft/z-Extras.tsx`, `src/pages/Restock/Draft/z-Extras.tsx`, `src/pages/Pos/page.tsx`, `src/pages/Restock/page.tsx`
- **Iteration:** 3

## Summary

The Pos and Restock cart screens are still one ~5,100-line workflow written twice, and the copies have visibly diverged: `z-ListingCard.tsx` differs by exactly two lines (a `data-testid` and `Harga Jual`/`Harga Beli`), while the 700-line payment grid `z-Methods.tsx` differs by a reworded comment and the Enter-on-underpaid behaviour (Pos keeps the editor open, Restock closes it). Recurring for the third audit: the shared `src/components/cart/` primitives landed last iteration, but the two highest-risk files — the payment grid and the line card — were not merged, so every fix still has to be made twice by hand.

## Details

## Evidence

Measured with `diff -u` and `wc -l` on the current tree:

| Pos | Restock | Pos lines | Restock lines | `diff -u` output |
|---|---|---|---|---|
| `src/pages/Pos/Draft/z-Methods.tsx` | `src/pages/Restock/Draft/z-Methods.tsx` | 734 | 718 | 75 lines (~95 % identical) |
| `src/pages/Pos/Draft/z-ListingCard.tsx` | `src/pages/Restock/Draft/z-ListingCard.tsx` | 358 | 357 | 2 hunks |
| `src/pages/Pos/Draft/z-Listing.tsx` | `src/pages/Restock/Draft/z-Listing.tsx` | 664 | 599 | ~280 lines |
| `src/pages/Pos/Draft/z-Extras.tsx` | `src/pages/Restock/Draft/z-Extras.tsx` | 492 | 441 | ~330 lines |
| `src/pages/Pos/page.tsx` | `src/pages/Restock/page.tsx` | 403 | 382 | largely parallel |
| **total** | | **2 651** | **2 497** | |

The two most expensive files are now near-verbatim copies. The entire `z-ListingCard` difference is:

```diff
-      data-testid="cart-line"
...
-          label="Harga Jual"
+          label="Harga Beli"
```

and `z-Methods` differs by a reworded comment, the removal of four props that only the Pos copy uses (`focusTop`, `onSubmit`), and this:

```diff
                   if (event.key === "Enter") {
                     event.preventDefault();
-                    // Underpaid: stay in the editor so the amount can be fixed.
-                    if (onSubmit()) setEditing(false);
+                    setEditing(false);
```

That means the payment grid — the most dangerous surface in the app, because it is where cash changes hands — exists twice, at 700+ lines each, with a **behavioural** divergence that is invisible to a reader of either file alone: in the Pos a short payment keeps the editor open, in Restock Enter always closes it.

`z-Listing` and `z-Extras` are the same file with the "stage toggle" cell removed and the labels swapped (`Harga Jual`/`Harga Beli`, `Cari barang untuk dijual...`/`dibeli...`), plus the Restock copy reading presets from `service.extra.get.changes` instead of `EXTRA_PRESETS`.

Some genuine sharing has landed since the last audit — `src/components/cart/` now holds `z-Cell`, `z-Issue`, `z-Note`, `z-Precision`, `z-SearchResults`, `z-Total`, `code-issues`, `run.ts`, `util-rupiah`, and both pages import `~/lib/purchase` for the money maths. The remaining split is not "different screens"; it is one screen parameterised by a `mode`.

Note also that the e2e hook `data-testid="cart-line"` exists only in the Pos copy, so the same test id silently does not exist for the Restock grid.

## Why it matters

* **Divergence is already visible and it is behavioural.** A fix applied to one copy (the last audit's `restock` credit-progress fix, the `code-issues` plumbing, the payment-listener cleanup) has to be applied twice by hand; the Enter-on-underpaid difference proves the copies have already drifted in user-visible ways. Two of the three previous audits filed this and it is still ~5 100 lines for one workflow.
* **Reasoning cost.** `record.live.ts` (1 774 lines) plus two 2 500-line page trees is the surface a maintainer must hold for a change to the cart; there is no single place where "what a quantity edit does" can be read.
* **Test coverage is duplicated-by-omission.** The behaviour only has to be right in whichever copy a test happens to drive — `e2e/pos-cart.e2e.ts` drives Pos, so the Restock payment grid's Enter semantics are untested.
* **Bundle size.** Both trees are lazily loaded per route, so both ship to the MSI.

## Recommended fix

Do not attempt a big-bang merge. Parameterise in the order that removes the most duplicated lines per unit of risk:

1. **`z-Methods`** (highest risk, most duplication, smallest real delta). Move it to `src/components/cart/z-Methods.tsx` and add a `mode: "sale" | "purchase"` prop (or an explicit `behaviour` object: `{ onSubmit?: () => boolean, payLabel, onExitUp? }`). The Pos passes `onSubmit`, Restock passes nothing; the Enter branch becomes `if (behaviour.onSubmit?.() ?? true) setEditing(false)`. Both call sites are already prop-driven, so this is a mechanical move plus one prop.
2. **`z-ListingCard`** — a `labels` prop (`{ price: "Harga Jual" | "Harga Beli" }`) and a `testId` prop; keep the `data-testid` on both so the e2e harness can be pointed at either grid.
3. **`z-Listing` / `z-Extras`** — extract the grid-keyboard core (`rows`/`cellAt`/`moveVertical`/`moveHorizontal`/`handleKeyDown`, ~200 lines each) into `src/components/cart/use-grid-nav.ts`, and let each page keep only its stage-toggle header cell. `src/pages/Pos/Draft/listing-grid.ts` and `extra-grid.ts` are already pure and can move next to it.
4. **`page.tsx`** — after (1)–(3), the two page components collapse into one `<CartScreen mode=…>`. `mode` already lives on the draft (`draft.mode === "incoming" | "outcoming"`), so this is mostly moving the `store`/`credit` differences behind it.

Keep the per-page preset differences (`EXTRA_PRESETS` vs `service.extra`) as props rather than branches inside the shared component.

## Acceptance criteria

- `src/pages/Pos/Draft/z-Methods.tsx` and `src/pages/Restock/Draft/z-Methods.tsx` no longer exist; one `src/components/cart/z-Methods.tsx` serves both routes.
- The payment grid's Enter-on-underpaid behaviour is specified once, as a prop, and covered by a test (`z-Methods` renders with and without `onSubmit`).
- `z-ListingCard` exists once; both grids render it with a `labels` prop, and `data-testid="cart-line"` resolves on both routes.
- `diff`-able duplication between the two page trees drops below ~500 lines total (measure: `wc -l src/pages/Pos/**` + `src/pages/Restock/**` before/after).
- The two routes still pass a manual smoke test: F1 search, F2 payment, F12 new tab, Ctrl+Arrow tab switch, Enter on underpaid stays in the editor (Pos) / closes (Restock), and the credit path on Restock.

## Verification

- `bun run typecheck && bun run lint && bun test` stay green (the existing `transaction/submit`, `record/*`, `code-issues` and grid tests are the safety net).
- `bun run test:e2e` — point `e2e/pos-cart.e2e.ts` at both `/pos` and `/restock` and assert the same `cart-line` rows appear.
- `git diff --stat` for the change should show net-negative line count; if the merged files grow, the parameterisation was done wrong.
- Grep guard for regressions: `rg -c 'Harga Jual|Harga Beli' src/` should return one file per label.
