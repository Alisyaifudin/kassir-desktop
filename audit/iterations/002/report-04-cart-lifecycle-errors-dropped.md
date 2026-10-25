---
slug: cart-lifecycle-errors-dropped
title: "Cart creation and tab deletion drop their errors: permanent spinner, and deleted carts resurrect"
severity: medium
category: correctness
iteration: 2
created: 2026-10-21T18:13:51.112Z
files:
  - "src/pages/Pos/page.tsx"
  - "src/pages/Restock/page.tsx"
  - "src/pages/Pos/Draft/z-Tabs.tsx"
  - "src/pages/_cart/run.ts"
  - "src/services/transaction/live.ts"
  - "src/components/SaveError.tsx"
---

# Cart creation and tab deletion drop their errors: permanent spinner, and deleted carts resurrect

- **Severity:** medium
- **Category:** correctness
- **Files:** `src/pages/Pos/page.tsx`, `src/pages/Restock/page.tsx`, `src/pages/Pos/Draft/z-Tabs.tsx`, `src/pages/_cart/run.ts`, `src/services/transaction/live.ts`, `src/components/SaveError.tsx`
- **Iteration:** 2

## Summary

`<SaveError>` was built so a failed cart write cannot be invisible, but it is only fed by the debounced flush. The rest of the cart lifecycle fires effects with empty rejection handlers: draft creation (`add.new`) failing leaves the POS on a permanent `<Loading/>` with no message and no retry (`Pos/page.tsx:264`), `Effect.runFork(service.transaction.delete.byId(...))` drops the error from a delete that removes the tab from the ref *before* deleting the row — so a "deleted" cart comes back on the next hydrate — and `_cart/run.ts` swallows failures for ~15 more call sites.

## Details

## Evidence

The transaction service already has a failure channel — `saveErrorRef` surfaced
by `<SaveError>` (`src/components/SaveError.tsx`, `role="status"`,
`aria-live="polite"`) — but only the debounced flush writes to it. Every other
cart-lifetime call in the two POS screens is fired with an empty rejection
handler or a bare fork, so its failure disappears:

**Draft creation** — `src/pages/Pos/page.tsx:137` and `:155-172` (identical at
`src/pages/Restock/page.tsx:117` and `:135`):

```ts
void Effect.runPromise(service.transaction.add.new("incoming")).then(onDraft, () => {});
// ... and in the "the screen always has a sale to show" effect the same silent
// rejection handler, after setting creating.current = true
```

`add.new` starts with `ensureLoaded()`, i.e. the first read of `tx*` tables — a
call that fails when the DB is unavailable (locked file, disk error, corrupt
`tx.db`). When it fails: `creating.current` is reset, **no state is written**, so
the effect never re-runs, and the render path falls through to

```ts
if (active === null) return <><Loading />{completeDialog}</>;   // Pos/page.tsx:264, Restock/page.tsx:243
```

The operator gets a permanent spinner with no message, no retry, and no way to
sell. The screen also keeps the spinner if the *first* `add.new` is rejected
after the parse of `?draft=` — nothing else creates a draft.

**Tab delete** — `src/pages/Pos/Draft/z-Tabs.tsx:45` (and
`src/pages/Restock/Draft/z-Tabs.tsx:45`):

```ts
run(service.transaction.delete.byId(pendingDelete.id));
```

`run` (`src/pages/_cart/run.ts`) is `void Effect.runFork(effect)` — a failed
fiber is never observed. `delete.byId` (`src/services/transaction/live.ts`)
removes the draft from the ref **first** and only then runs
`DELETE FROM tx_records`:

```ts
written.delete(id);
yield* SubscriptionRef.update(draftsRef, (list) => list.filter((d) => d.id !== id));
yield* db.execute("DELETE FROM tx_records WHERE tx_record_id = $1", [id])   // may fail
  .pipe(Effect.mapError(toError));
```

So a failed delete closes the tab on screen while the row survives in SQLite:
the next `hydrate()` (restart, or the Topbar reload) brings the "deleted" cart
back with its lines, to be sold again. The cashier has already been told it is
gone.

**Everything else** — `run()` also swallows the failures of the 15+ call sites
in `Pos/Draft/z-Customer.tsx` (9), `Pos/Draft/z-Methods.tsx` (4),
`Restock/Draft/z-Supplier.tsx` (4). Most of those go through
`update()` which cannot fail today, which is exactly why the pattern is
dangerous: the day one of them gains a validation `Effect.fail` (and `submit`
already does), the UI will silently refuse the edit.

## Why it matters

The cart is the money. `.agent/agent.md` and `.agent/skills/*` both say failures
must reach the operator; `<SaveError>` was written for precisely this reason
("the screen said saved, the disk disagreed, and a crash lost the sale with no
trace"). These paths bypass it, so the two worst outcomes are both reachable and
silent: a POS that cannot start a sale at all, and a deleted cart that comes back
from the dead with the stock/prices of the day it was parked.

## Recommended fix

1. **Give the fire-and-forget helper a failure channel.** Replace
   `_cart/run.ts` with two helpers:

```ts
// Edits inside a draft: the service owns the ref and debounces; failures are
// reported, not dropped.
export function runQuiet(effect: Effect.Effect<unknown, { message: string }>) {
  void Effect.runFork(effect.pipe(Effect.catchAll((e) => reportCartError(e.message))));
}
```

   where `reportCartError` sets the same ref `<SaveError>` reads (export a
   `TransactionService.reportError(message)` or route through a small
   `saveErrorRef` setter on the service), so the banner/toast the app already
   has becomes the single cart-failure surface.

2. **Make the draft-creation paths explicit.** `add.new` rejection must render a
   real error state ("Tidak bisa memulai transaksi" + retry), not `<Loading />`.
   A `useState<string | null>` next to `creating` is enough; pass it down where
   `active === null` is rendered.

3. **Fix the ordering in `delete.byId`.** Delete the row first, then drop it from
   the ref; if the delete fails, leave the tab and surface the message. Same
   rule `submit` already follows ("the cart is about to become a record; no
   debounced rewrite may fire after…").

## Acceptance criteria

- `rg -n "then\([^)]*,\s*\(\)\s*=>\s*\{\}\)" src/pages` returns nothing.
- With the `tx.db` handle broken (test double that fails `selectMany`), opening
  Pos/Restock shows an error message with a retry, not an endless spinner.
- A failed `tx_records` delete leaves the tab visible and shows a message; a
  successful one leaves no row (`SELECT count(*) FROM tx_records WHERE
  tx_record_id = ?` = 0), verified by a unit test in
  `src/services/transaction/`.
- `Effect.runFork` in `src/pages/**` is only used for effects whose error type is
  `never` (typecheck-enforced, not convention).

## Verification

```
rg -n "runPromise|runFork" src/pages/Pos src/pages/Restock src/pages/_cart
bun run typecheck && bun test
```

Manual: rename `tx.db` in the app data dir (simulating a corrupt file) and open
Pos — an error state must appear. Restore it, park a cart, kill the app mid-delete
via the test double, relaunch, and confirm the tab either survived *and* was
reported, or was truly deleted.
