---
slug: cart-flush-silent-and-whole-draft
title: "Cart writes fail silently and rewrite the entire draft on every edit"
severity: high
category: correctness
iteration: 1
created: 2026-10-21T17:30:13.057Z
files:
  - "src/services/transaction/live.ts"
  - "src/pages/Pos/page.tsx"
  - "src/lib/constants.ts"
  - "src/lib/log.ts"
---

# Cart writes fail silently and rewrite the entire draft on every edit

- **Severity:** high
- **Category:** correctness
- **Files:** `src/services/transaction/live.ts`, `src/pages/Pos/page.tsx`, `src/lib/constants.ts`, `src/lib/log.ts`
- **Iteration:** 1

## Summary

The POS cart is persisted by rewriting every row of the draft 100 ms after each edit, and `flush` swallows failures into `Effect.logError` while callers use bare `Effect.runFork`. A failed write is invisible in the UI and absent from the Tauri log, so a cart that looks saved can vanish on crash/reload; the rewrite is also O(lines + discounts) statements per keystroke.

## Details

## Evidence

The open cart is written to SQLite as **whole-aggregate rewrites on a 100 ms debounce**, and every failure on that path is swallowed.

`src/services/transaction/live.ts`:

```ts
function flush(id: string): Effect.Effect<void> {                       // 369
  return Effect.gen(function* () {
    const drafts = yield* SubscriptionRef.get(draftsRef);
    const draft = drafts.find((d) => d.id === id);
    if (draft === undefined) return;
    yield* db
      .transaction(statementsFor(draft))
      .pipe(Effect.catchAll((error) => Effect.logError(`tx flush failed: ${error.message}`)));  // 376
  });
}

function schedule(id: string) {                                          // 382
  const existing = timers.get(id);
  if (existing !== undefined) clearTimeout(existing);
  timers.set(id, setTimeout(() => { timers.delete(id); Effect.runFork(flush(id)); }, DEBOUNCE_DELAY));
}

function update(id: string, change: (draft: Draft) => Draft) {           // 395
  return Effect.gen(function* () {
    yield* SubscriptionRef.update(draftsRef, (drafts) => drafts.map(…));
    schedule(id);
  });
}
```

`statementsFor(draft)` (line ~148) is `INSERT tx_records … ON CONFLICT DO UPDATE` followed by `DELETE FROM tx_listings WHERE tx_record_id = $1` and a re-`INSERT` of **every** listing, every discount, every extra, every method, and every image row. `DEBOUNCE_DELAY` is `100` (`src/lib/constants.ts:89`).

The callers drop the Effect's error channel entirely:

```ts
// src/pages/Pos/page.tsx
const setLines  = (next: Line[])  => void Effect.runFork(service.transaction.listings.set(active.id, next));
const setExtras = (next: Extra[]) => void Effect.runFork(service.transaction.extras.set(active.id, next));
```

`Effect.runFork` on an effect whose error channel is already `never` (because of the `catchAll` inside `flush`) cannot surface anything, and `Effect.logError` goes to Effect's default logger (the console). The app's own log (`src/lib/log.ts` → `tauri-plugin-log`) is never touched here, so nothing appears in **Setting → Log**, which is where a shopkeeper or support would look.

## Why it matters

- **Silent cart loss.** The in-memory `SubscriptionRef` is the truth the UI renders; the DB copy is best-effort. If a flush fails (locked DB, disk full, migration in flight) the operator sees a perfectly healthy cart that is not on disk. A crash, a forced quit, or `window.location.reload()` (the Topbar Refresh button!) loses the sale being rung up and there is no trace of why.
- **100 ms debounce + full rewrite is the worst combination for the SQL plugin.** Every keystroke in the note field or a qty cell re-emits the whole draft list to every subscriber (repainting the POS) and then, 100 ms later, issues ~2 statements per line plus 2 per discount. A 40-line cart with one discount per line is ~200 statements per edit, on one shared `data.db` connection that the POS, product list and record views all use.
- `DELETE` + re-`INSERT` also churns primary keys and `rowid`, so `ORDER BY rowid` in `SELECT_LISTINGS` (`transaction/live.ts:100`) gives new ordering after each flush — the grid order and the DB order can disagree.

## Recommended fix

1. **Make the write incremental.** Replace `statementsFor` for `listings.set`/`extras.set`/`methods.set` with a diff against the previous draft (deleted ids, inserted ids, changed ids) so one edit writes one or two rows, not the whole cart. Keep the full rewrite only for `add.new` and `unsubmit`.
2. **Surface failures.** Return the error from `flush` through a `SubscriptionRef<string | null>` the POS renders (a small "belum tersimpan" badge plus a toast via `toast.error`), and log through `log.error` (`src/lib/log.ts`) so it reaches the file the Log page reads. Do not `catchAll` into `Effect.logError`.
3. **Drain before destructive actions.** `window.location.reload()`, app close, and `transaction.submit` should `flush` synchronously (await the effect) instead of relying on the debounce — `submit` already clears the timer (line ~567) but a reload does not.
4. Add a "cart not persisted" invariant test: make `db.transaction` fail once in a test layer and assert the UI state and the log.

## Acceptance criteria

- A failed cart write is visible to the cashier (badge/toast) and recorded in the Tauri log file.
- Editing one cell of one line issues O(1) statements, not O(lines + discounts).
- Reloading the window during a cart edit never loses the last committed edit.
- A test covers a flush failure and the resulting user-visible state.

## Verification

- Add a temporary `Effect.fail` to `flush` in a dev build and confirm: (a) the cashier sees a message, (b) `%LOCALAPPDATA%/…/logs/kassir.log` contains the failure, (c) Setting → Log lists it.
- Enable SQLite query logging, edit one qty cell in a 30-line cart and count the statements executed in the following 200 ms.
