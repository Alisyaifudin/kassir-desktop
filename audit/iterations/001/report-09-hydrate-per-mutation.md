---
slug: hydrate-per-mutation
title: "Every mutation re-reads the whole aggregate from SQLite instead of patching the ref"
severity: medium
category: performance
iteration: 1
created: 2026-10-21T17:31:45.483Z
files:
  - "src/services/product/live.ts"
  - "src/services/extra/live.ts"
  - "src/services/method/live.ts"
  - "src/services/money/live.ts"
  - "src/services/cashier/live.ts"
  - "src/services/record/live.ts"
---

# Every mutation re-reads the whole aggregate from SQLite instead of patching the ref

- **Severity:** medium
- **Category:** performance
- **Files:** `src/services/product/live.ts`, `src/services/extra/live.ts`, `src/services/method/live.ts`, `src/services/money/live.ts`, `src/services/cashier/live.ts`, `src/services/record/live.ts`
- **Iteration:** 1

## Summary

Most services answer every write with `yield* hydrate()`, re-selecting the entire aggregate from SQLite (product reloads six tables, 20 call sites) and replacing every object in its `SubscriptionRef`. Cost scales with catalogue size, destroys referential stability for memoised lists, and diverges from the documented "write backend then update the ref" pattern that `CashierLive` already follows.

## Details

## Evidence

Every mutation in the aggregate services answers by **re-reading the whole domain from SQLite** rather than patching its `SubscriptionRef`, exactly the opposite of the pattern documented in `.pi/skills/services.md` ("Mutations write the backend **then** the ref").

`src/services/product/live.ts` — 20 call sites of `yield* hydrate()`:

```
425  function hydrate()
436  yield* hydrate();      // ensureLoaded
549  yield* hydrate();      // add
566,580,590,603,616,633,646,659,676,689,713,741,754,768,777,804,828,860   // every set.add/update
863  refresh: () => hydrate()
```

and `hydrate()` runs `loadAll()`, which selects **six tables** every time:

```ts
const [productRows, listingRows, propertyRows, productNameRows, imageRows, stockRows] =
  yield* Effect.all([ … ]);     // product/live.ts:380-390
```

The same shape appears in `src/services/extra/live.ts` (`hydrate()` at 97, 114, 130), `src/services/method/live.ts` (136, 152, 183), `src/services/money/live.ts` (232, 248, 262, 277, 301), and `src/services/product/live.ts` for stock adjustments.

Product forms call these per field/blur, so a single edit session produces a burst of full-catalogue reloads, each one:

1. issuing 6 IPC round-trips (`db.selectMany` → `plugin-sql` → sqlx),
2. rebuilding every `ProductState` object graph (so **every** product object identity changes),
3. `SubscriptionRef.set(...)` → re-emitting to `changes`/`changesFull` → every subscribed page re-renders the entire catalogue (`src/pages/Product/page.tsx:30`, `Product/Detail/page.tsx:26`, `Product/Detail/Info/page.tsx:13`, `Product/Detail/Image/page.tsx:35`).

`TransactionService` does the same on submit (`TransactionLive` re-reads nothing, but `record.refreshProducts()` → `product.refresh()` → the six-table reload after every sale).

## Why it matters

- **Scales with catalogue size, not with the edit.** A shop with 5,000 products and 8,000 listings reloads ~15k rows after renaming one product, over the IPC bridge, on the same single SQLite connection the POS uses. The product page will visibly stall and the POS will queue behind it.
- **It destroys referential stability**, which is why memoisation in the product list cannot work: after any write, every `Product` is a new object. That is the root cause of the re-render cost in the React report.
- **It amplifies the stale-cache bug**: because `product` refreshes and `listing` does not, the two caches diverge in a way that looks intentional.
- Extra/method/money services pay the same tax for a one-row rename.

## Recommended fix

1. Make each `set.*` patch the `SubscriptionRef` with the value it just wrote (the pattern already used correctly in `CashierLive` — `src/services/cashier/live.ts` `set.name`/`set.role`/`add`/`delete` all `SubscriptionRef.update` instead of reloading; use it as the template).
2. Reserve `hydrate()`/`refresh()` for cases where the write genuinely has unbounded fan-out (record commit moving stock across lots) and for initial load. Keep `refresh()` on `product` because `record` legitimately changes stock, but make it reload **only the affected product ids** (`refresh(ids: string[])`).
3. If a full reload is unavoidable, keep unchanged object identities (`const next = prev.map(p => changed.has(p.id) ? reload(p) : p)`) so downstream memoisation survives.
4. Add a cheap guard test: count `db.selectMany` calls for one `set.info` mutation (there is already a test-layer harness in `src/services/db/test-support.ts`).

## Acceptance criteria

- Renaming a product issues a single `UPDATE` and updates one entry in `productsRef`; no six-table `SELECT` burst.
- A sale updates only the stock of the products it touched.
- Object identity of untouched products is preserved across a mutation (verifiable with `expect(after[0]).toBe(before[0])` for an unrelated product).
- `rg -c "yield\\* hydrate\\(\\)" src/services/product/live.ts` drops from 20 to ≤3 (ensureLoaded, refresh, add).

## Verification

- Instrument `DatabaseService.selectMany` with a counter in `src/services/db/test-support.ts`; assert one `product.set.info` call performs no `SELECT` on `products`, `listings`, `stocks`, `images`, `product_names`, `properties`.
- Manual: with 5,000 seeded products, rename one and time the UI update; before/after comparison.
