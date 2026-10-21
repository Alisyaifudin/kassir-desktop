---
slug: catalogue-invalidation-by-wall-clock
title: "Catalogue cache decides \"unchanged\" from wall-clock milliseconds, so a write can be silently dropped"
severity: high
category: correctness
iteration: 2
created: 2026-10-21T18:12:38.799Z
files:
  - "src/services/product/live.ts"
  - "src/services/listing/live.test.ts"
  - "src/services/product/stock-sql.ts"
  - "src/services/listing/live.ts"
---

# Catalogue cache decides "unchanged" from wall-clock milliseconds, so a write can be silently dropped

- **Severity:** high
- **Category:** correctness
- **Files:** `src/services/product/live.ts`, `src/services/listing/live.test.ts`, `src/services/product/stock-sql.ts`, `src/services/listing/live.ts`
- **Iteration:** 2

## Summary

`ProductService.hydrate()` reuses the previous `ProductState` when every `*_updated_at` number matches, and those numbers are `Date.now()` stamped by the writer. Two writes to the same row inside one millisecond therefore read back as "unchanged": the ref keeps the old object, emits nothing, and the POS keeps the old price and old stock. This is exactly the stale-catalogue class iteration 1 fixed, re-introduced by its own optimisation — and it is why `bun test` (the CI gate that now blocks the MSI build) fails on `listing service > repricing a listing is visible without a reload` when the whole suite runs, yet passes when the file is run alone.

## Details

## Evidence

Reproduced in this working tree, twice:

```
$ bun test                       # whole suite
(fail) listing service > repricing a listing is visible without a reload
error: expect(received).toBe(expected)
Expected: 2500
Received: 1000
      at src/services/listing/live.test.ts:88:28
 197 pass / 1 fail

$ bun test src/services/listing/live.test.ts   # same file alone
3 pass / 0 fail
```

The test is not flaky by accident — it is a timing-dependent assertion over a
change detector built on wall-clock timestamps:

1. The writer stamps the row with `Date.now()`:
   - `src/services/product/live.ts:301` — `UPDATE listings SET ... listing_updated_at = $7, listing_sync_at = NULL`
   - `src/services/product/stock-sql.ts:118,183,270,281` — every stock movement sets `stock_updated_at = $2`
2. `hydrate()` re-reads the whole catalogue and decides identity by comparing
   those numbers only (`src/services/product/live.ts:430-452`):

```ts
function sameChildren<T extends { id: string; updatedAt: number }>(a: T[], b: T[]): boolean {
  return a.length === b.length &&
    a.every((item, index) => item.id === b[index].id && item.updatedAt === b[index].updatedAt);
}
function sameState(a, b) {
  return a.name === b.name && a.note === b.note && a.updatedAt === b.updatedAt &&
    a.syncAt === b.syncAt && sameChildren(a.listings, b.listings) && /* stocks, properties, names, images */;
}
```

3. If the second write lands in the same millisecond as the row's existing
   `listing_updated_at` (which is one `Date.now()` earlier — the test creates and
   edits the listing back to back), `sameState` returns `true`, `merged` keeps the
   **previous** `ProductState`, and `hydrate()` short-circuits:

```ts
const merged = states.map((state) => {
  const before = byId.get(state.id);
  return before !== undefined && sameState(before, state) ? before : state;
});
// Nothing actually changed: do not emit, so no page re-renders.
const unchanged = merged.length === previous.length && merged.every((state, i) => state === previous[i]);
if (unchanged) return;
```

4. `get.all()` and `get.changes` then hand out the stale object, and the
   `productViews` WeakMap (line 490-503) keeps the stale `Product` derived from it.

So `ListingLive`'s projection is correct (`src/services/listing/live.ts` now
maps `product.get.all()` with no cache of its own) — but it projects a state that
the product service failed to update.

## Why it matters

- **It is a money bug, not a test nit.** The POS prices a sale from
  `service.listing.get.changes` / `get.search`. A price or stock change that the
  ref never absorbed means the next sale is rung at the old price and against the
  old stock, i.e. the exact failure mode "stale-listing-cache" was filed for in
  iteration 1.
- **The windows are wider than "same millisecond" sounds.** `Date.now()` has 1 ms
  granularity at best, and coarser under load or for a non-focused window on
  Windows. Multi-write flows write the same product in one tick by design — the
  product form saves info, listings, stocks, properties and names as separate
  service calls, and `record.add.draft` writes several stock rows plus the
  product in one transaction.
- **It blocks the release.** `.github/workflows/windows-release.yml` runs
  `bun run typecheck`, `bun run lint`, `bun test` before `tauri-action`. A red
  suite means no MSI, and a *flaky* suite teaches everyone to re-run CI until it
  is green — which is how the next real regression ships.
- **The test suite is the only guard on this path, and it is currently losing.**
  Deleting or weakening the test would be the wrong fix; the detector itself is
  unsound.

## Recommended fix

Stop inferring "did anything change" from a wall clock. The writers already know
exactly what they wrote, so tell `hydrate()` instead of asking the database:

1. **Preferred — pass the touched ids.** `hydrate({ touched: [productId] })`
   from every `product.set.*`, `add`, and from `record.add.draft` /
   `delete` / `set.mode`. For those products, skip the equality check and take
   the freshly read state; for everything else keep the identity reuse (it is
   the right optimisation, it just needs a trustworthy invalidation signal).
2. **If you keep read-then-compare,** compare the fields the app actually reads,
   not only the timestamps: `name`, `note`, listing `name/price/unit/code/kind`,
   stock `value/capital`, image `order/name`, and lengths. That is a handful of
   primitives per child row and cannot be fooled by a clock.
3. **Do not** "fix" it by making the test sleep. Same-millisecond writes are
   normal; the detector has to survive them.

While you are in `hydrate()`: it re-reads all six tables (`products`, `listings`,
`properties`, `product_names`, `images`, `stocks`) on every mutation. Once a
touched-id set exists, the re-read can be scoped to those ids and the remaining
products reused untouched — that closes the second half of iteration 1's
`hydrate-per-mutation` finding as well.

## Acceptance criteria

- A unit test pins the behaviour deterministically, e.g. stub `Date.now()` to a
  constant across a create + `set.listing.update` + `get.search`, and assert the
  new price is returned. No `sleep`, no reliance on suite ordering.
- The same test set extended to stock: a sale (`record.add.draft` or
  `transaction.submit`) reflected in `product.get.byId(id).stock` and in
  `listing.get.all()[i].stock` immediately after the commit, in the same tick.
- `bun test` passes 20 consecutive full-suite runs (that is the flake bar, not 1).
- `product/live.test.ts`'s identity guarantees still hold: an untouched product
  keeps object identity across another product's write, and a no-op hydrate
  emits nothing.

## Verification

```
bun test                                   # must be green, repeatedly
bun test src/services/listing src/services/product
bun run typecheck
```

Then manually: open Product → Detail → Info, change a listing price, immediately
go to Pos, search that listing, and confirm the card shows the new price without
pressing the Topbar reload button. Repeat with a sale: sell 1 pc, return to Pos,
confirm the stock on the card decreased.
