---
slug: product-import-accepts-negative-price-and-stock
title: "The product import boundary accepts negative prices and negative stock capital"
severity: medium
category: correctness
iteration: 5
created: 2026-10-21T19:54:16.141Z
files:
  - "src/pages/Setting/Data/ProductUpload/util-validate-product.ts"
  - "src/services/product/live.ts"
  - "src/pages/Setting/Data/ProductUpload/z-Schema.tsx"
  - "src/services/record/validate-line.ts"
---

# The product import boundary accepts negative prices and negative stock capital

- **Severity:** medium
- **Category:** correctness
- **Files:** `src/pages/Setting/Data/ProductUpload/util-validate-product.ts`, `src/services/product/live.ts`, `src/pages/Setting/Data/ProductUpload/z-Schema.tsx`, `src/services/record/validate-line.ts`
- **Iteration:** 5

## Summary

The product JSON import (and `product.add` behind it) validates only the shape: `price: z.number()` and `stocks: [{ value, capital }]` accept negative and zero values, and the writer inserts them straight into `listings`/`stocks`. Unlike the record import — hardened in iteration 3 with `validate-line.ts` plus tests — a bad file here poisons the catalogue with negative prices and negative cost basis, and the cashier only discovers it at `Bayar` when submit refuses the sale line with no pointer back to the broken product.

## Details

## Evidence

The product import validates **shape**, not values —
`src/pages/Setting/Data/ProductUpload/util-validate-product.ts:6-22`:

```ts
const listingSchema = z.object({
  name: z.string().nonempty(),
  price: z.number(),            // ← negative and zero allowed
  unit: z.number().int().positive(),
  …
});
const productSchema = z.object({
  …
  stocks: z.array(z.object({ value: z.number(), capital: z.number() })).min(1),
  …
});
```

The service does not add a check either — `src/services/product/live.ts:630-670`
(`add`) validates only `listings.length === 0` / `stocks.length === 0`, then pushes
`listingInsert(...)` and `receiveStatements(...)` straight into the transaction:

```rust
bindings: [listingId, productId, input.name, input.price, input.unit, …]
```

Compare the record import, which was hardened in iteration 3: it now routes every
line through `src/services/record/validate-line.ts` (`validateRecordLine`) from
both entry points, with the qty > 0 / `unit >= 1` / `price >= 0` / `capital >= 0`
rules and nine tests in `src/services/record/import.test.ts`. The product import
was left as the looser twin: a JSON file with `"price": -10000`,
`"stocks": [{ "value": -50, "capital": -900 }]` is accepted, and no test covers
it (`util-validate-product.ts` has no test file; only the record one does).

Downstream effects of the accepted values:

- the negative price is written to `listings.listing_price`, so the product shows
  up in the POS catalogue with a negative `priceRange`
  (`src/pages/Product/z-ProductBits.tsx`) and can be added to a cart;
- `transaction.submit` then refuses the *sale* with `Harga X tidak valid`
  (`src/services/transaction/live.ts`, `SubmitError{kind:"price"}`) — the operator
  is stopped at `Bayar` with no hint which catalogue row is broken, and the cart
  cannot be made payable from that screen;
- a negative `stocks.capital` becomes a stock lot with negative capital, which
  feeds `product.capital` and the Performance margin (`use-performance.ts`), so
  the loss/profit figures for that product are wrong from then on;
- a negative `stocks.value` is indistinguishable from a legitimate shortage lot,
  so nothing later flags the import as bad.

## Why it matters

This is the same root cause the third audit filed against the *record* import and
that iteration 3 fixed there: an external boundary that checks the JSON shape and
trusts the numbers. The record path is now guarded on both ways in and has tests;
the product path, which writes to the same catalogue the POS sells from, is not.
A single bad export/import cycle silently poisons prices and cost basis, and the
first symptom appears at the payment step of a real sale.

## Recommended fix

1. Add the numeric rules to `util-validate-product.ts` (boundary) and to
   `product.add` (writer), in one shared place — the precedent is
   `src/services/record/validate-line.ts`:

```ts
// src/services/product/validate-input.ts
export function validateProductInput(input: ProductInput): string | null
// name non-empty, listings non-empty,
// every listing price >= 0, unit integer >= 1, kind known, code length <= N,
// every stock value finite, capital >= 0,
// products with duplicate codes refused (already the record import's rule)
```

   Call it from `product.add` so the Product form, the import and any future
   writer inherit it, and again in `extractProduct` so the message names the
   offending product before the dialog's "Impor" is pressed.
2. Refuse two listings with the same `code` in one product (the record import
   already computes code collisions; the product file has no equivalent).
3. Extend `z-Schema.tsx` (the dialog that documents the file format) with the
   rules, so the documented format and the accepted format are the same thing.

## Acceptance criteria

- A file with a negative price, negative stock value or negative capital is
  refused with a message naming the product, before any write.
- `product.add` refuses the same input when called directly (test), so the form
  and the import cannot drift.
- No row reaches `listings`/`stocks` with a negative price or negative capital.
- `util-validate-product.test.ts` exists and covers: negative price, zero price,
  `unit: 0`, negative capital, empty listings, duplicate codes, and one valid file.

## Verification

- `bun test src/pages/Setting/Data/ProductUpload` green with the new cases.
- Manual: import a JSON with one good product and one with `"price": -1` — the
  dialog reports the bad product and the catalogue is unchanged
  (`SELECT COUNT(*) FROM products` before/after).
- `psql`-equivalent check on a real `data.db`:
  `SELECT COUNT(*) FROM listings WHERE listing_price < 0` → 0.
