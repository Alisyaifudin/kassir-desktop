---
slug: full-catalogue-reload-on-every-commit
title: "Every commit re-reads the entire catalogue before the sale is reported as done"
severity: medium
category: performance
iteration: 6
created: 2026-10-21T20:20:15.614Z
files:
  - "src/services/record/live.ts"
  - "src/services/product/live.ts"
  - "src/services/listing/live.ts"
  - "src/components/cart/code-issues.ts"
---

# Every commit re-reads the entire catalogue before the sale is reported as done

- **Severity:** medium
- **Category:** performance
- **Files:** `src/services/record/live.ts`, `src/services/product/live.ts`, `src/services/listing/live.ts`, `src/components/cart/code-issues.ts`
- **Iteration:** 6

## Summary

`record.submit` awaits `product.refresh()`, which re-reads and re-maps all six catalogue tables before it returns — so the success dialog, and the whole `inert` cart, wait on a full catalogue scan on every sale. Identity diffing keeps React cheap, but the read is O(catalogue) per commit and grows exactly as the shop's product list grows.

## Details

## Evidence

Every record write ends with a **full six-table catalogue reload**, and `submit`
happens before the promise the completion dialog waits on resolves:

```ts
// src/services/record/live.ts:1376-1385
yield* commit(statements);
yield* bumpRevision();
// Stock moved, so the product aggregate is stale. A failure here must
// not fail the submit: the record is already committed.
yield* refreshProducts().pipe(
  Effect.catchAll((error) => Effect.logError(`product refresh after submit failed: ${error.message}`)),
);
return recordId;                       // ← the dialog opens only after the reload
```

`refreshProducts` is `product.refresh()` (`record/live.ts:717-721`) → `hydrate()`
(`src/services/product/live.ts:515`) → `loadAll()`, which re-reads **every row of six
tables** and re-maps them (`product/live.ts:378-414`):

```ts
const [productRows, listingRows, propertyRows, productNameRows, imageRows, stockRows] =
  yield* Effect.all([
    db.selectMany<ProductRow>(SELECT_PRODUCTS),
    db.selectMany<ListingRow>(SELECT_LISTINGS),
    db.selectMany<PropertyRow>(SELECT_PROPERTIES),
    db.selectMany<ProductNameRow>(SELECT_PRODUCT_NAMES),
    db.selectMany<ImageRow>(SELECT_IMAGES),
    db.selectMany<StockRow>(SELECT_STOCKS),
  ]);
```

Then it diffs every row to preserve object identity (`sameListing`, `sameStock`, …,
`product/live.ts:432-500`) so React re-renders little. `ListingLive` re-projects that
array (`src/services/listing/live.ts:83-91`), which allocates a **new** `Listing[]`
identity per emit, so the derived caches keyed on the array — `buildCatalogByCode`
(`src/components/cart/code-issues.ts:32-42`) and the search index
(`src/lib/search/listings.ts`) — are rebuilt/revalidated on the same tick too.

The other write paths do the same thing (`record/live.ts:955-959` for a direct credit
record, `:1571-1572` for a mode switch, `:1657-1662` for a delete), so this cost is paid
on every record mutation, not only on Bayar.

Scale: the project targets a grosir catalogue; the search benchmark in this repo runs
`5,000 listings` (`src/lib/search/listings.test.ts`). At 5,000 listings plus their
products, stocks, names, properties and images, the reload is tens of thousands of rows
per sale — anecdotally hundreds of milliseconds over the Tauri SQL IPC, all of it in the
window between pressing `Bayar` and the success dialog appearing.

The identity-diff machinery is good engineering and should stay: it is what prevents
React from re-rendering the whole catalogue. The problem is the *read* that feeds it.

## Why it matters

`Bayar` is the most repeated interaction in the app; the operator presses it hundreds of
times a day. Whatever sits between the click and the confirmation is perceived as the
speed of the app, and at a busy counter the next customer is already in front. The
reload also runs while the cart is already committed but the UI is still `inert`
(`Pos/page.tsx:169`, `inert={submitting}`), so a slow catalogue turns into a frozen
window at the worst moment.

It is also the reason a sale can feel "stuck" on a large database while the same sale is
instant on a fresh one — the kind of bug that is reported as "aplikasi lambat" and never
traced back to one line.

## Recommended fix

Keep the freshness guarantee (the POS must never sell a stale price or stock — there are
tests pinning that: `src/services/transaction/catalogue.test.ts`), but stop paying for a
full read on every commit:

1. **Targeted refresh (preferred).** After a commit, refresh only the products the record
   touched. `RecordService` already knows the affected `product_id`s (they are computed
   while allocating lots). Add
   `product.refreshMany(ids: string[])` that runs the same six SELECTs with
   `WHERE product_id = ANY(...)` and merges the results into the existing
   `ProductState[]` (reusing the identity-diff helpers). A sale of three products then
   reads three products, not the catalogue.
2. **Keep the full `refresh()` for the paths that can move anything** — import
   (`services/record/import.ts`), product delete, and the startup hydrate. Everything
   else moves lots, and the sold `product_id`s are known at that point.
3. **Move the refresh off the submit's critical path regardless.** The record is committed
   before the refresh; `submit` can resolve and open the dialog, then fork the refresh so
   the grid updates a moment later. If you keep the await, at least yield with
   `Effect.fork` + a revision bump so a slow read cannot keep the window inert.
4. Add a benchmark test at grosir scale (like `searchListings` does): seed 5,000
   products, submit a one-line sale, assert the number of rows read for the refresh is
   bounded by the sale's lines (a spy on `db.selectMany` or an assertion on the SQL
   `WHERE` clause), not by the catalogue size.

## Acceptance criteria

- Submitting a sale reads O(lines) catalogue rows, not O(catalogue); `product.refresh()`
  (full read) is called only from hydrate, import and product mutation paths.
- The POS catalogue still reflects the just-sold stock and price in the same tick
  (`services/transaction/catalogue.test.ts` keeps passing, unchanged).
- The success dialog appears without waiting for the catalogue read (or, at minimum,
  the window is not `inert` during it).
- A grosir-scale test asserts the bounded read.

## Verification

- `bun test src/services/transaction/catalogue.test.ts src/services/product/live.test.ts`
  — stock/price identity guarantees unchanged.
- New benchmark test at 5,000 products asserting the refresh read count.
- Manual: seed a large catalogue, ring up a one-line sale on a Windows build and compare
  the `Bayar` → dialog latency before/after (Setting → Log timestamps are enough).
