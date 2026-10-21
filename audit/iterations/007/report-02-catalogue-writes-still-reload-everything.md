---
slug: catalogue-writes-still-reload-everything
title: "Every catalogue write still re-reads the whole catalogue, though the narrow refresh path already exists"
severity: medium
category: performance
iteration: 7
created: 2026-10-21T20:42:25.666Z
files:
  - "src/services/product/live.ts"
  - "src/services/extra/live.ts"
  - "src/services/method/live.ts"
  - "src/services/money/live.ts"
  - "src/services/transaction/live.ts"
  - "src/services/cashier/live.ts"
---

# Every catalogue write still re-reads the whole catalogue, though the narrow refresh path already exists

- **Severity:** medium
- **Category:** performance
- **Files:** `src/services/product/live.ts`, `src/services/extra/live.ts`, `src/services/method/live.ts`, `src/services/money/live.ts`, `src/services/transaction/live.ts`, `src/services/cashier/live.ts`
- **Iteration:** 7

## Summary

Recurring (iteration 1, still `partial`): every product write re-reads the entire catalogue through six unfiltered `SELECT`s — 20 `hydrate()` call sites in `product/live.ts`, including a rename of two columns. The narrow `hydrateMany(ids)` path that iteration 6 added for `submit` is exactly the fix and is simply not used by the edit paths. Same pattern in `extra`, `method`, `money`. Identity preservation removed the re-render cost; the read cost still scales with the catalogue and is paid inside the same Effect as the save.

## Details

## Evidence

`src/services/product/live.ts` re-reads the **whole catalogue** on every write.
`hydrate()` (`:571-586`) calls `loadAll()`, which runs the six `SELECT_*`
statements declared at `:338-348` — `products`, `listings`, `properties`,
`product_names`, `images`, `stocks` — with no `WHERE`, builds a `ProductState`
per product, and only then decides (correctly) whether to emit.

There are 20 call sites. A single-field edit is enough:

```ts
// src/services/product/live.ts:768-784
set: {
  info(id, info) {
    …
    yield* commit([{ sql: `UPDATE products SET product_name = $1, product_note = $2, …` … }]);
    yield* hydrate();          // ← six full-table SELECTs for two columns
  },
```

and the same shape at `listing.add` / `listing.update` (`:787-808`), `:816`,
`:829`, `:846`, `:859`, `:872`, `:889`, `:902`, `:926`, `:954`, `:967`, `:981`,
`:990`, `:1017`, `:1041`, `:1073`, and `product.refresh()` (`:1076`).

The narrow path already exists — and is already used where it matters most:
`hydrateMany(ids)` (`:597-640`, "so a committed record costs O(its lines) instead
of O(catalogue)") is what `refreshMany` hands to `transaction.submit` and
`record.add.draft`. The edit/mutation paths were never converted.

The same pattern holds in the other catalogue services: `extra/live.ts` hydrates
after `add` (`:97`) and `set.info` (`:114`) and `delete` (`:130`);
`method/live.ts` after four writes (`:136`, `:152`, `:183`);
`money/live.ts` after five (`:232`, `:248`, `:262`, `:277`, `:301`), and there the
aggregate is a `GROUP BY` over the whole `money` journal, which only grows.

`product/live.ts:727-740` already knows this is the wrong shape — mutations carry
a comment about the "record cost" — while the writes next to it still do the full
load.

## Why it matters

Iteration 1 filed this (`hydrate-per-mutation`, marked **partial**) and only the
*downstream* half was fixed: object identity is preserved, so pages no longer
re-render everything. The *upstream* half — the cost of the read — is untouched,
and it is the half that grows with the shop.

Concretely, on a grosir catalogue (roughly 5 000 products, 15 000 listings,
20 000 stock rows) every one of the following re-materialises tens of thousands of
rows across the plugin IPC boundary and rebuilds `ProductState` objects that are
then thrown away:

- saving the product info pane (`Product/Detail/Info/z-EditPane.tsx`),
- adding or repricing one listing,
- a stock adjustment (`z-StockAdjust.tsx`),
- adding a product property, an alternative name, or an image row,
- every `extra` and `method` write from the Extra/Method admin pages, which the
  POS reads live through `useExtraPresets` / `method.get.catalogChanges`.

Because it happens inside the same Effect as the write, it also delays the
`SubscriptionRef` emission — the dialog's "saved" state waits for the reload.

## Recommended fix

Make the narrow path the default and keep the full load for the first read and
for an explicit refresh:

1. Give `ProductService` a private `refreshOne(id)` = `hydrateMany([id])` (the
   function already handles "not loaded yet" and "created by this write").
2. Replace `yield* hydrate()` with `yield* hydrateMany([id])` at the 16 mutation
   sites that touch exactly one product (`set.info`, `set.listing.*`,
   `set.property.*`, `set.productName.*`, `set.image.*`, `set.stock.*`), keeping
   `add.new` → `hydrate()` (it also creates sibling rows the edit pane expects) or
   `hydrateMany([newId])` once you are sure.
3. Same for `extra`, `method`, `money`: `CashierLive` (`cashier/live.ts`) already
   shows the intended shape — write the backend, then patch the ref with
   `SubscriptionRef.update` instead of re-selecting.
4. Leave `get.changes`/`get.all` semantics alone; this changes cost, not
   behaviour.

## Acceptance criteria

- A single-product write issues at most the `loadMany` statement set (one
  `WHERE product_id IN (…)` per table), not `loadAll`.
- A test asserts the statement count: 0 full-table `SELECT`s after
  `product.set.info`, mirroring the existing
  "a commit re-reads only the products its lines touched" test in
  `src/services/transaction/submit.test.ts`.
- Existing identity/no-emit tests in `src/services/product/live.test.ts` stay
  green (unchanged rows keep their object, no emission when nothing changed).
- `extra`/`method`/`money` writes no longer call `hydrate()`; a new `money` entry
  keeps the pocket card correct (the `live.test.ts` cases already cover this).

## Verification

`bun test src/services/product src/services/money src/services/extra` and
`bun test src/services/transaction/submit.test.ts`. Time one edit against a
seeded 5 000-product catalogue before/after (the sql.js harness in
`src/services/db/test-support.ts` can seed it). `tsc --noEmit`, `eslint`.
