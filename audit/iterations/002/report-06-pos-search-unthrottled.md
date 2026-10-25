---
slug: pos-search-unthrottled
title: "POS search re-queries the whole catalogue on every keystroke, unlike every other search box"
severity: medium
category: performance
iteration: 2
created: 2026-10-21T18:14:41.669Z
files:
  - "src/pages/Pos/Draft/z-Listing.tsx"
  - "src/pages/Restock/Draft/z-Listing.tsx"
  - "src/services/listing/live.ts"
  - "src/lib/search/listings.ts"
  - "src/pages/Pos/page.tsx"
  - "src/pages/Pos/Draft/z-ListingCard.tsx"
  - "src/pages/Product/z-Search.tsx"
---

# POS search re-queries the whole catalogue on every keystroke, unlike every other search box

- **Severity:** medium
- **Category:** performance
- **Files:** `src/pages/Pos/Draft/z-Listing.tsx`, `src/pages/Restock/Draft/z-Listing.tsx`, `src/services/listing/live.ts`, `src/lib/search/listings.ts`, `src/pages/Pos/page.tsx`, `src/pages/Pos/Draft/z-ListingCard.tsx`, `src/pages/Product/z-Search.tsx`
- **Iteration:** 2

## Summary

The POS search bar is the only search in the app that is not debounced: Product, Extra and Record all use `useDebouncedCallback`, while `Pos/Draft/z-Listing.tsx` feeds every keystroke straight into `listing.get.search`, which rebuilds a catalogue-sized `Map` and rescoring/ sorting pass per character. The same screen also rebuilds a catalogue-wide code map (`findLineIssues`) on every cart edit, and `ListingCard` is unmemoised with inline callbacks, so one keystroke re-renders every `useSortable`/`motion` card. Small catalogues hide it; a grosir catalogue turns typing into a stutter.

## Details

## Evidence

The POS product search re-queries on every keystroke, with no debounce and no
deferred value — while every *other* search box in the app debounces:

```
src/pages/Product/z-Search.tsx:2,9      import { useDebouncedCallback } from "use-debounce";
                                        const debounced = useDebouncedCallback(onChange, DEBOUNCE_DELAY);
src/pages/Extra/z-Search.tsx:2,17       same
src/pages/Record/z-Header/SearchBars.tsx:6,14   same
src/pages/Pos/Draft/z-Listing.tsx        (no debounce; see below)
```

`src/pages/Pos/Draft/z-Listing.tsx`:

```tsx
const results = useQuery(() => Stream.fromEffect(service.listing.get.search(query)), [query], {
  keepPrevious: true,
});
...
<Input type="search" value={query} onChange={(event) => setQuery(event.currentTarget.value)} />
```

Every keystroke → new `query` → new fiber → `ListingService.get.search`
(`src/services/listing/live.ts`), which per call:

1. `toListings(products)` — cached by array identity, cheap;
2. `matching()` — `const byId = new Map(listings.map(({id, ...}) => [id, l]))`
   over the **whole catalogue**, per query;
3. `searchListings()` (`src/lib/search/listings.ts`) — scores every entry against
   the query four ways (`gradeCode`, then `gradeText` for the listing name, the
   product name, and *each* alias), then `hits.sort((a, b) => b.score - a.score)`.

So one typed character costs one catalogue-sized Map allocation plus a full
score-and-sort pass, on the same input event that also re-renders the cart.

The cart grid has the same shape of cost from the other side:

- `src/pages/Pos/page.tsx` — `findLineIssues(active?.listings ?? [], listingData)`
  is memoised on `[active?.listings, listingRes]`, and `active.listings` is a new
  array after *every* cart edit, so `findLineIssues`
  (`src/pages/_cart/code-issues.ts`) rebuilds a `Map` over the entire catalogue's
  codes on each keystroke inside a cart cell.
- `src/pages/Pos/Draft/z-ListingCard.tsx` is not `memo`-wrapped and receives
  inline lambdas from the parent (`onChange={(patch) => …}`,
  `onSelect={(field, sub) => …}`, `onRemove={() => …}`), so a parent render
  re-renders every card — each one running `useSortable` and a `motion.div` — no
  matter which card actually changed.

I did **not** measure this on a large fixture in this audit; the claim here is
structural (O(catalogue) work per keystroke, three debounced neighbours, no
memoisation), not a profiler number.

## Why it matters

A POS terminal is the one screen where input latency is felt continuously: the
cashier types a product name while the customer is watching. At a few hundred
listings this is invisible; a grosir catalogue (the Product page's own index and
sort ladder are built for thousands of products — `@tanstack/react-virtual` is
already used for the results list) turns each keystroke into Map + scan + sort +
full-cart re-render, which is exactly the "no layout thrash / no unnecessary
re-renders in cart tables" goal in the audit brief. The inconsistency is also a
maintenance trap: someone reading `Product/z-Search.tsx` will assume search is
debounced everywhere.

## Recommended fix

1. **Same debounce as the rest of the app.** Keep the input value local and defer
   the query: `const [query, setQuery] = useState("")` for the field,
   `const debounced = useDebouncedCallback(setQuery, DEBOUNCE_DELAY)` (already
   imported as `~/lib/constants`), and feed the debounced value to `useQuery`. Do
   **not** debounce the `hidden` cut-over — the results pane should appear as soon
   as the first character does.
   `useDeferredValue(query)` is the alternative if you want the input never to
   wait; either way, one search per pause, not per character.
2. **Move the per-query allocations into the cached index.** `getListingIndex`
   already caches an `index` keyed by a signature; put the `id → SearchableListing`
   map (or the `Listing` itself) in that object so `matching()` stops rebuilding
   it per keystroke.
3. **Stop rebuilding the code map per cart keystroke.** Compute `catalogByCode`
   once per catalogue change (a `useMemo` on `listingRes` alone, or inside the
   listing service as a derived stream) and pass it into `findLineIssues`.
4. **Memoise the cart card with stable handlers.** Hoist the per-card callbacks to
   `useCallback` keyed by `line.id` (or pass `lineId` and a single stable
   dispatcher) and wrap `ListingCard` in `memo`, so a keystroke in one card does
   not re-render twenty `useSortable` nodes.

## Acceptance criteria

- `rg -n "setQuery\(" src/pages/Pos/Draft/z-Listing.tsx src/pages/Restock/Draft/z-Listing.tsx`
  shows the search query entering the service only through a debounced path.
- A benchmark fixture (a `bun test` measuring `searchListings` over 5,000 listings,
  asserting a per-query budget, e.g. < 8 ms on the CI runner) exists next to
  `src/lib/search/listings.test.ts`, and `matching()` no longer allocates a
  catalogue-sized Map per query.
- Typing 6 characters into the POS search bar issues **one** `listing.get.search`
  per pause (instrument with a counter in the test or the e2e).
- With 30 cart lines, typing into one card's price field does not re-render the
  other 29 (React DevTools highlight-updates, or a render counter in a test).

## Verification

```
bun test src/lib/search
bun run test:e2e      # e2e/pos-cart.e2e.ts types a query and must still pass
```

Manual at scale: import a few thousand products (Setting → Data → Product upload),
open Pos, and hold a key in the search field — the grid must stay responsive and
the results must settle after the key is released.
