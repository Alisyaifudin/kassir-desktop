---
slug: stock-history-keyset-cursor-skips-events
title: "Stock-history paging drops events that share a timestamp, and its Masuk/Keluar filter only filters the loaded page"
severity: medium
category: correctness
iteration: 9
created: 2026-10-21T21:31:59.113Z
files:
  - "src/pages/Product/Detail/Info/History/use-history.ts"
  - "src/pages/Product/Detail/Info/History/index.tsx"
  - "src/services/product/live.ts"
  - "src/services/product/stock-sql.ts"
  - "src/services/product/index.ts"
---

# Stock-history paging drops events that share a timestamp, and its Masuk/Keluar filter only filters the loaded page

- **Severity:** medium
- **Category:** correctness
- **Files:** `src/pages/Product/Detail/Info/History/use-history.ts`, `src/pages/Product/Detail/Info/History/index.tsx`, `src/services/product/live.ts`, `src/services/product/stock-sql.ts`, `src/services/product/index.ts`
- **Iteration:** 9

## Summary

The stock-history pager uses `product_event_created_at < cursor` as its keyset while its `ORDER BY` already had to add `product_event_id` as a tiebreak, and a single record commit writes one event per lot with the same `now` — so a page boundary inside a same-instant group silently drops the rest of the group, in the one screen that is supposed to be the auditable record of stock. The Masuk/Keluar filter is applied client-side to the loaded page while `done` is computed on the unfiltered page, so a filtered view can report "Belum ada pergerakan stok" while matches exist one page back, and `product_events` has no `(product_id, created_at)` index for the query.

## Details

## Evidence

The stock-history pager is a keyset cursor on a **non-unique** timestamp.

`src/pages/Product/Detail/Info/History/use-history.ts`:

```ts
const loadMore = useCallback(() => {
  if (loading || done) return;
  const last = events[events.length - 1];
  if (last === undefined) return;
  void load(last.createdAt, true);      // cursor = createdAt only
}, [loading, done, events, load]);
```

`src/services/product/live.ts:1044-1059`:

```sql
SELECT product_event_id, product_event_created_at, ...
FROM product_events
WHERE product_id = $1 AND ($2 IS NULL OR product_event_created_at < $2)
ORDER BY product_event_created_at DESC, product_event_id DESC
LIMIT $3
```

The `ORDER BY` knows the key is not unique (it adds `product_event_id DESC` as a tiebreak), but the `WHERE`
does not: a page that ends in the middle of a group of same-instant events loses the rest of the group on the
next page, permanently.

Same-instant groups are the normal case, not an edge case. A single record commit stamps every statement it
writes with one `now`, and `src/services/product/stock-sql.ts` writes **one event per lot** for one line:

- `consumeStatements` (`:168-192`) — `for (const { lot, take } of takes) { … insertEvent(eventId, productId,
  lot.id, -take, lot.capital, now, …) }`: a sale of 5 pcs drained from 3 lots → 3 events for that product with
  identical `product_event_created_at`.
- `drainStatements` (`:96-130`) — the same shape for purchases.
- `receiveAtCapital` (`:202+`) — "moves the newest stock into the oldest with their own journal events", again
  all at one `now`.

So a page boundary is likely to land inside such a group for exactly the products a shopkeeper looks at most
(the fast movers, which have many lots). "Muat lebih banyak" then returns events strictly older than the group
and silently skips the remaining ones — the journal that is supposed to be the auditable record of stock shows
fewer movements than happened, with no error and no gap indicator.

The second half of the same root cause is in `src/pages/Product/Detail/Info/History/index.tsx`:

```ts
const filtered = events.filter((event) =>
  mode === "all" ? true : mode === "in" ? event.value > 0 : event.value < 0,
);
…
{filtered.length === 0 ? <p>… "Belum ada pergerakan stok."</p> : <HistoryTable events={filtered} />}
```

The Masuk/Keluar filter is applied **client-side to the already-paged slice**, while `done` is computed from
the unfiltered page (`use-history.ts`: `setDone(page.length < PAGE)`). With `mode = "in"`, a page of 20 "Keluar"
events renders the empty state "Belum ada pergerakan stok." even though incoming movements exist one page back,
and nothing tells the operator to press "Muat lebih banyak".

Index support is also missing for the query shape: `product_events` has only
`CREATE INDEX product_event_product_idx ON product_events (product_id)` (`src-tauri/src/database/51-60/migration-51.sql:222`,
repeated in `41-50/migration-43.sql:371`), so each page is a full scan of that product's events plus a sort.

## Why it matters

Stock is event-sourced; the history list is the only place a shopkeeper can check *why* a number is what it is.
A pager that drops rows, plus a filter whose empty state lies, turns the audit surface into a source of
misinformation: the shop concludes a delivery was never recorded when it was. Nothing surfaces an error, so
this never gets noticed as a bug — only as "the history is wrong sometimes".

## Recommended fix

1. Cursor on the full sort key. Change the service signature to
   `history(productId, { before?: { createdAt: number; id: string }; limit })` and the predicate to

   ```sql
   WHERE product_id = $1
     AND ($2 IS NULL OR (product_event_created_at, product_event_id) < ($2, $3))
   ORDER BY product_event_created_at DESC, product_event_id DESC
   LIMIT $4
   ```

   (SQLite supports row-value comparison; if you prefer to stay explicit, spell it as
   `product_event_created_at < $2 OR (product_event_created_at = $2 AND product_event_id < $3)`).
   `useHistory` then passes the last row's `{ createdAt, id }`.

2. Add the index the query wants, in a **new** migration (append-only):
   `CREATE INDEX product_event_product_time_idx ON product_events (product_id, product_event_created_at DESC, product_event_id DESC);`

3. Filter on the server, not on the loaded page: give `history` an `in | out | null` argument and add the
   predicate (`product_event_value > 0` / `< 0`) to the same query, so `done` means "no more matching rows"
   and the empty state is true. The UI's three buttons then just change the argument.

## Acceptance criteria

- A product with 25 events where events 18-24 share one `created_at` shows all 25 across two "Muat lebih
  banyak" clicks (a test builds them with `consumeStatements`/`drainStatements` at a single `now`).
- `done` becomes true only when the last page of the *filtered* query is short; the empty state is shown only
  when the filter genuinely has no matches in the whole history.
- The new index exists in a new migration and `src/services/db/migration-chain.test.ts` still passes
  (contiguity + checksum).

## Verification

```
bun test src/services/product/live.test.ts      # new pagination cases
bun test src/services/db/migration-chain.test.ts
bunx tsc --noEmit && bunx eslint . --max-warnings 0
```

Manual: open a product with a multi-lot sale history, press "Muat lebih banyak" until the end, and count the
rows against `SELECT COUNT(*) FROM product_events WHERE product_id = ?`.
