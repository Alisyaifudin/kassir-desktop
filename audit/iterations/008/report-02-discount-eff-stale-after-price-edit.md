---
slug: discount-eff-stale-after-price-edit
title: "Editing a line's price leaves the line's discount `eff` at the old price, and the record/receipt inherit the stale money"
severity: medium
category: correctness
iteration: 8
created: 2026-10-21T21:08:10.061Z
files:
  - "src/components/cart/z-ListingCard.tsx"
  - "src/components/cart/z-Listing.tsx"
  - "src/components/cart/z-Discount.tsx"
  - "src/lib/purchase.ts"
  - "src/services/record/live.ts"
---

# Editing a line's price leaves the line's discount `eff` at the old price, and the record/receipt inherit the stale money

- **Severity:** medium
- **Category:** correctness
- **Files:** `src/components/cart/z-ListingCard.tsx`, `src/components/cart/z-Listing.tsx`, `src/components/cart/z-Discount.tsx`, `src/lib/purchase.ts`, `src/services/record/live.ts`
- **Iteration:** 8

## Summary

A cart line stores its discount's derived `eff`/`total` inside the editable line, so every mutation site has to re-derive it. Quantity changes do (`z-ListingCard.tsx:288`, `bumpQty`, `addListing`), the discount dialog does, but the price cell does not (`onCommit={(raw) => onChange({ price })}`), so after correcting a price the cart still applies the old rupiah discount while telling the cashier "10%" — and `record.add.draft` re-derives the line total from that same stale `eff`, so the wrong figure becomes immutable history and a wrong receipt.

## Details

## Evidence

A cart line stores its discounts as **derived values** (`eff`, the rupiah taken off, and `total`, the running total after it) inside the very same object the user edits:

```ts
// src/lib/purchase.ts:57
export function recalcDiscounts<T extends DiscountLine>(price, qty, lines) { … }
```

Every place that mutates a line is responsible for calling `recalcDiscounts` again. Three of the five call sites remember; the price path does not.

**Recalculated (correct):**

- `src/components/cart/z-ListingCard.tsx:288` — quantity: `onChange({ qty: next, discounts: recalcDiscounts(line.price, next, line.discounts) })`
- `src/components/cart/z-Listing.tsx` — `addListing` (bump an existing line) and `bumpQty` both call `recalcDiscounts`
- `src/components/cart/z-Discount.tsx:175` — `commit()` calls `recalcDiscounts(line.price, line.qty, normalize(next))`

**Not recalculated (the bug):**

- `src/components/cart/z-ListingCard.tsx:222` — the price cell:

  ```tsx
  onCommit={(raw) => onChange({ price: Number(raw) || 0 })}
  ```

  No `discounts` in the patch, so every stored `eff` keeps the rupiah it had at the old price.

- `src/components/cart/z-ListingCard.tsx:204` — the unit cell (`onChange({ unit })`) has the same shape, though the money effect there is indirect.

Concrete drift, all of it persisted:

1. Line: price 10.000, qty 1, discount `percent 10` → `eff = 1.000`, line total 9.000.
2. Cashier corrects the price to 20.000 (`onCommit` at `z-ListingCard.tsx:222`).
3. Cart now holds `price: 20000`, `discounts[0] = { kind: "percent", value: 10, eff: 1000 }`.
4. `lineGrandTotal` (`src/lib/purchase.ts:39`) = `20.000 − 1.000 = 19.000`; the discount column still reads **"10%"** (`formatValue` at `src/components/cart/z-Discount.tsx:63`).
5. `linesSubtotal` → `purchaseTotal` → the grand total the cashier pays, and `src/services/record/live.ts:1176` recomputes exactly the same number from the stored `eff`, so the record, the receipt and the day's totals all carry Rp1.000 of discount where the cart said 10% (Rp2.000).

The `pcs` kind drifts identically (`eff = value × price`, so a price change invalidates it the same way), and a *lowered* price can make the stale `eff` larger than the line — which walks straight into report 01.

Nothing in the cart warns about the divergence, and there is no test: `src/lib/purchase.ts` has no unit test at all (see report 07), and `src/pages/Record/Item/z-Detail/discounts.test.ts` only covers rendering of already-stored values.

## Why it matters

The percent shown in the UI and the rupiah actually charged diverge silently, in the direction that either overcharges or undercharges the customer, and the divergence is written into immutable history (`records` is append-only by design — the detail page cannot even edit a line). A cashier correcting a mis-keyed price is not an edge case in a POS: "salah harga, betulkan" is the most common correction there is, and it is exactly the operation that leaves the discount behind.

It also means the cart has two sources of truth for the same money: `discounts[].eff` (stored) and `price × qty × value%` (derivable). Everything downstream trusts the stored one.

## Recommended fix

Make the derived discount impossible to leave stale, rather than remembering to call `recalcDiscounts` in one more place:

1. **Single write path for a line.** In `src/components/cart/z-Listing.tsx`, wrap the per-line `onChange` the cards receive so every patch goes through one function:

   ```ts
   function patchLine(id: string, patch: Partial<Line>) {
     onChange(lines.map((line) =>
       line.id === id
         ? { ...line, ...patch, discounts: recalcDiscounts(patch.price ?? line.price, patch.qty ?? line.qty, line.discounts) }
         : line,
     ));
   }
   ```

   and hand `patchLine` to `ListingCard` instead of a raw `onChange`. Then `QtyCell`/`z-Discount` stop recalculating on their own (they currently have to), and a future field cannot forget.

2. **Or derive instead of store.** Drop `eff`/`total` from the persisted line and compute them from `(price, qty, kind, value)` wherever they are needed — `lineGrandTotal` already exists in `src/lib/purchase.ts`, and `z-Discount`'s grid only needs a `deriveDiscounts(line)` selector. This removes the drift class entirely; it is the smaller conceptual change but touches `z-Discount`'s rendering and the discount payload sent to `record.add.draft`.

Either way, keep the invariant testable: export a `recalcDiscounts`-based helper (`withDerivedDiscounts(line)`) and unit-test that a price change recomputes `eff`.

## Acceptance criteria

- After editing a line's price in the cart, the discount column, the line total, the cart total, the record and the printed receipt all agree with the discount *kind and value* currently shown (10% of the new price, `pcs × new price`).
- No component outside one shared helper calls `recalcDiscounts`; a `grep -rn "recalcDiscounts(" src/components/cart` shows it only inside the line-patch helper (and `z-Discount` if the derive route is taken).
- A unit test asserts: percent 10 on (10.000, qty 1) → `eff 1.000`; change the price to 20.000 → `eff 2.000`.
- Changing the price never leaves `lineGrandTotal` below zero without the line rendering an issue (pairs with report 01).

## Verification

- `bun test` with the new case in `src/lib/purchase.test.ts` (or a `z-ListingCard`/`z-Listing` render test that types into the price cell and asserts the discount cell's text and the row total).
- Manual: Pos → add a line at Rp10.000 → Diskon → Angka/Persen 10% → close → edit the price cell to Rp20.000 → Enter → the Diskon cell must read "10%" **and** the row's total must be Rp18.000 (not Rp19.000); submit and check `SELECT record_listing_price, record_listing_total FROM record_listings ORDER BY rowid DESC LIMIT 1` on the new record.
