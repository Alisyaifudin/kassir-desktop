---
slug: post-commit-refresh-failure-reported-as-write-failure
title: "Three record writes run the catalogue refresh inside their own result, so a post-commit read error is reported as \"nothing happened\" — and `unsubmit` then throws the sale away"
severity: high
category: correctness
iteration: 11
created: 2026-10-21T22:16:24.990Z
files:
  - "src/services/record/live.ts"
  - "src/services/transaction/live.ts"
  - "src/pages/Setting/Data/RecordUpload/z-Selected.tsx"
  - "src/components/cart/z-Complete.tsx"
---

# Three record writes run the catalogue refresh inside their own result, so a post-commit read error is reported as "nothing happened" — and `unsubmit` then throws the sale away

- **Severity:** high
- **Category:** correctness
- **Files:** `src/services/record/live.ts`, `src/services/transaction/live.ts`, `src/pages/Setting/Data/RecordUpload/z-Selected.tsx`, `src/components/cart/z-Complete.tsx`
- **Iteration:** 11

## Summary

`RecordService` re-reads the product aggregate after the record transaction commits. The submit path already knows this is a *post*-commit step and catches the failure (`record/live.ts:1409-1413`, with a comment saying the record is already committed); `add.external` (`:974-978`), `set.mode` (`:1629-1631`) and `delete.byId` (`:1716-1721`) do not, so a failed re-read is returned as a failed operation. The consequences are worse than a misleading message: `transaction.unsubmit` (the completion dialog's "Batalkan") rolls the restored cart back when `delete.byId` reports a failure — but the soft delete has already committed, so the sale disappears from both history and the cart; and the record importer maps the same error to "skipped", so a row that was written is reported as not written.

## Details

## Evidence

**The rule already exists in the same file.** `record.add.draft` (the sale path) ends with:

```ts
// src/services/record/live.ts:1404-1413
// Stock moved, so the product aggregate is stale. A failure here must
// not fail the submit: the record is already committed. ...
yield* refreshProductsFor(lotsByProduct.keys()).pipe(
  Effect.catchAll((error) =>
    Effect.logError(`product refresh after submit failed: ${error.message}`),
  ),
);
```

**Three sibling writes do not follow it.** Each commits, then `yield* refreshProducts()` unguarded, so a database read error after the commit propagates out of the operation as its result:

- `src/services/record/live.ts:974-978` — end of `add.external` (the JSON import writer):
  ```ts
  yield* commit(statements);
  yield* bumpRevision();
  // Stock moved, so the product aggregate is stale; this runs after the
  // commit, as it does for every other record write.
  yield* refreshProducts();
  ```
- `src/services/record/live.ts:1629-1631` — end of `set.mode` (the sale/purchase flip), after the new record was inserted, every line/method/extra/image row was re-pointed and every stock event was reversed.
- `src/services/record/live.ts:1716-1721` — end of `delete.byId`, after the soft delete, the event deletion and every lot restore, with a comment that literally says "a failure here means the delete committed but the cached stock is behind".

`refreshProducts()` is `product.refresh()` → a full `hydrate()` of the catalogue (`:717-721`), i.e. six table reads that can fail on any SQLite error.

**Consequence 1 — `unsubmit` loses the sale (money/data loss).** `transaction.unsubmit` restores the cart first and then deletes the record, treating *any* `Left` from the delete as "the delete did not happen":

```ts
// src/services/transaction/live.ts:1030-1043
const removed = yield* Effect.either(record.delete.byId(recordId)...);
if (Either.isLeft(removed)) {
  // Do not leave a second copy of the sale behind: undo the restore,
  // then report the delete failure.
  yield* db.execute("DELETE FROM tx_records WHERE tx_record_id = $1", [draft.id])...
  yield* SubscriptionRef.update(draftsRef, (list) => list.filter((d) => d.id !== draft.id));
  return yield* Effect.fail(removed.left);
}
```

`z-Complete` (`src/components/cart/z-Complete.tsx:88-99`) shows `error` from that failure and keeps the dialog open, so the cashier reads "gagal, coba lagi". Reality: the record was soft-deleted and its stock compensated (committed), and the restored cart was just deleted with it. The sale is now in neither the records list nor a draft — the uniquely unrecoverable state in this app, produced by the "Batalkan" button that exists to make mistakes recoverable.

**Consequence 2 — the importer reports written rows as skipped.** `RecordUpload` treats any `RecordError` from `add.external` as a per-row skip:

```ts
// src/pages/Setting/Data/RecordUpload/z-Selected.tsx:59-71
yield* service.record.add.external(record).pipe(
  Effect.catchTag("RecordError", ({ message }) =>
    Effect.sync(() => {
      skippedRows.push({ key: `${index}`, name: `...`, reason: message });
    }),
  ),
);
```

so a post-commit refresh failure lands in the "N dilewati" list (and in `describeUpload`'s "0 … dilewati" error message) for a record that is already in the database with its stock moved. The operator's natural response — fix and re-import — double-writes the row.

**Consequence 3 — `set.mode` is not idempotent to retry.** A flip that "fails" after committing left the old id a tombstone; retrying `mode(oldId, …)` reads the tombstone and creates a *third* record.

## Why it matters

Every other write in the record layer is careful about commit boundaries (the `submit` comment is the clearest statement of the rule in the repo). These three invert it: the post-commit step that cannot undo anything is allowed to decide what the user is told. Two of the three are the "undo a sale" and "import my old data" flows, which are exactly the ones where the operator retries — and a retry after a completed write is how this app produces duplicated history and double-moved stock.

## Recommended fix

1. In `record/live.ts`, apply the `add.draft` pattern to `add.external`, `set.mode` and `delete.byId`: wrap the trailing refresh in `Effect.catchAll` that logs (`Effect.logError`) and returns `Effect.void`. The writes are already committed; the refresh is a cache warm-up, never part of the operation's contract.
2. Extract it so the rule cannot be forgotten a fourth time, e.g. a local `refreshProductsAfterCommit(ids)` helper next to `refreshProducts`/`refreshProductsFor` that never fails, and use it at all four sites.
3. While there: `set.mode` and `delete.byId` know the exact products they moved (the `product_events` / `SELECT_JOURNALED_PRODUCTS` rows they already read) — pass them to `refreshProductsFor` instead of re-reading the whole catalogue.
4. In `transaction.unsubmit`, only roll back the restored draft when the delete genuinely failed (e.g. check whether the record is still active after the failure, or have `delete.byId` return a discriminated result instead of a bare failure).

## Acceptance criteria

- A `product.refresh()` failure injected after the commit of `add.external`, `set.mode` and `delete.byId` leaves the operation returning success (a record id / void), logs one error, and commits nothing extra.
- With that same injected failure, `transaction.unsubmit(recordId)` still returns the restored draft id, the record is soft-deleted, and the draft survives in `get.changes`.
- A record import whose rows all commit but whose post-commit refresh fails reports every row as *written*, not skipped.
- A unit test in `src/services/record/*.test.ts` pins the invariant: "a failure in the post-commit catalogue refresh never changes the result of a record write" (three cases, one per write).

## Verification

- `bun test` (the new cases fail before the change: the writes return `RecordError`).
- Extend `src/services/transaction/flush.test.ts`-style harness: stub `ProductService.refresh` to fail, call `tx.unsubmit(recordId)`, assert `Either.isRight` and that `tx.get.changes` still contains the draft.
- `npx tsc --noEmit`, `npx eslint . --max-warnings 0`.
