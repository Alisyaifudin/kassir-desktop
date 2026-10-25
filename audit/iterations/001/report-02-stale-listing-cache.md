---
slug: stale-listing-cache
title: "POS catalogue is a second, never-invalidated source of truth (stale stock, invisible new products)"
severity: high
category: architecture
iteration: 1
created: 2026-10-21T17:29:59.154Z
files:
  - "src/services/listing/live.ts"
  - "src/services/product/live.ts"
  - "src/services/record/live.ts"
  - "src/services/wiring.ts"
  - "src/pages/Pos/page.tsx"
  - "src/pages/Restock/page.tsx"
  - "src/layouts/authenticated/z-Refresh.tsx"
---

# POS catalogue is a second, never-invalidated source of truth (stale stock, invisible new products)

- **Severity:** high
- **Category:** architecture
- **Files:** `src/services/listing/live.ts`, `src/services/product/live.ts`, `src/services/record/live.ts`, `src/services/wiring.ts`, `src/pages/Pos/page.tsx`, `src/pages/Restock/page.tsx`, `src/layouts/authenticated/z-Refresh.tsx`
- **Iteration:** 1

## Summary

`ListingLive` caches prices/stock/codes in its own `SubscriptionRef` and has no invalidation path: `product.refresh()` and `record.refreshProducts()` update a different cache. The POS therefore shows pre-sale stock, misses newly created products, and sells stale prices until the user presses the Topbar's full-page-reload button.

## Details

## Evidence

Two services cache the same catalogue tables with no invalidation path between them.

`src/services/listing/live.ts` (the *only* catalogue the POS reads):

```ts
const ref = yield* SubscriptionRef.make<Listing[]>([]);
let loaded = false;                                    // line 58

function ensureLoaded() {                              // line 132
  return Effect.gen(function* () { if (loaded) return; yield* hydrate(); });
}

return {
  get: {
    all:  () => ensureLoaded().pipe(Effect.zipRight(SubscriptionRef.get(ref))),
    search: (query) => ensureLoaded().pipe(…),
    changes: Stream.unwrap(ensureLoaded().pipe(Effect.as(ref.changes))),
  },
};
```

There is no `refresh`, no `revalidate`, and nothing outside `ListingLive` can touch `ref`. `Listing` records include `price`, `stock`, `code`, `cover`, and `altNames` read from `listings`, `stocks`, `images`, `products`, `product_names` (same file, `SELECT_*` constants) — i.e. everything the cashier searches on.

`src/services/product/live.ts` is a second, independent cache of the same rows (`SELECT_PRODUCTS`, `SELECT_LISTINGS`, `SELECT_STOCKS`, `SELECT_IMAGES`, …), and it *does* get refreshed after writes:

```ts
refresh: () => hydrate(),            // product/live.ts:863
```

`src/services/record/live.ts` calls it after every commit:

```ts
function refreshProducts() { return product.refresh().pipe(…); }   // 826
…
yield* commit(statements);
yield* bumpRevision();
yield* refreshProducts();                                          // after submit/delete/unsubmit
```

Nothing calls `service.listing` for invalidation. A repo-wide search shows the listing service is referenced in exactly four places, all reads:

```
src/pages/Pos/page.tsx:104            const listingRes = useStream(service.listing.get.changes);
src/pages/Pos/Draft/z-Listing.tsx:126 service.listing.get.search(query)
src/pages/Restock/page.tsx:74         const listingRes = useStream(service.listing.get.changes);
src/pages/Restock/Draft/z-Listing.tsx:111
```

`src/services/wiring.ts` merges `productLive` and `listingLive` as siblings — `recordLive` gets `productLive` provided, `listingLive` is nobody's dependency, so even the pattern that provably refreshes stock (`record → product.refresh`) cannot reach it.

The consequence is visible in the product itself: the Topbar ships a full page reload as the only way to resync —

```tsx
// src/layouts/authenticated/z-Refresh.tsx
onClick={() => window.location.reload()}
```

## Why it matters

- **Overselling.** `Pos/Draft/z-SearchResults.tsx` renders `listing.stock` (`stockClass` on the stock span) from this stale cache. After the first sale, every quantity shown in the POS search results is wrong until the cashier reloads the whole app. The sale path does no stock check of its own, so the displayed number is the only guard.
- **New products are invisible.** Creating a product in `/products` writes to `products`/`listings`; the POS cache was hydrated at boot and stays empty of it. The cashier's workaround is the reload button.
- **Price/code edits are invisible**, which is worse than nobody-showing-it: the POS sells the old price.
- It defeats the stated mental model ("services own state, one `SubscriptionRef` per concern") — here one concern has two owners and one of them is never told.

## Recommended fix

Pick one owner for the sellable catalogue and make it a projection, not a copy:

1. **Preferred:** delete `ListingLive` and expose the POS view as a derived stream on `ProductService` (`get.changes.pipe(Stream.map(toListings))`), building the search index from that stream. One `SubscriptionRef`, one `hydrate`, and `record.refreshProducts()` already invalidates it.
2. If `ListingLive` must stay (it holds a flattened, search-optimised shape), then:
   - wire it as a dependency of `record`/`product` in `src/services/wiring.ts` (`ListingLive.pipe(Layer.provide(productLive))` + a `Stream` subscription to `product.get.changes` that re-derives `ref`), **or**
   - expose `listing.refresh()` and call it from `product` mutations and from `transaction.submit` (both already call `refreshProducts`).
3. Add a stock guard at submit time in `TransactionService.submit` (compare line qty in pcs against the lot total) so the UI number is a display, not the law.
4. Remove `z-Refresh.tsx`'s `window.location.reload()` once invalidation is real; a native app should not need a refresh button.

## Acceptance criteria

- Creating, renaming, repricing, or deleting a product makes it appear/disappear with the new values in `/pos` search results **in the same session, without reload**.
- Completing a sale immediately updates the stock shown for the sold listing in `/pos`.
- There is exactly one `SubscriptionRef` that owns catalogue rows (or an explicit, tested derivation between the two).
- A unit or e2e test asserts the above (e2e already boots the real app with sql.js).

## Verification

1. `bun run dev`, create a product with stock 5, open `/pos`, search for it → it must be there with stock 5.
2. Sell 2, return to search → stock must read 3 without pressing Refresh.
3. Edit the price in `/products`, return to `/pos` → new price in the results and in the cart line added from it.
4. `rg -n "window.location.reload" src` returns nothing.
