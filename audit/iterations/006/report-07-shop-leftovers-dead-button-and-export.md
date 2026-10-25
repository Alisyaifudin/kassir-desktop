---
slug: shop-leftovers-dead-button-and-export
title: "Dead Shop leftovers still ship: a permanently disabled record action and an export nobody calls"
severity: low
category: maintainability
iteration: 6
created: 2026-10-21T20:21:40.285Z
files:
  - "src/pages/Record/z-Detail/ToTransaction.tsx"
  - "src/pages/Record/z-Detail/index.tsx"
  - "src/pages/Record/z-Detail/use-delete.ts"
---

# Dead Shop leftovers still ship: a permanently disabled record action and an export nobody calls

- **Severity:** low
- **Category:** maintainability
- **Files:** `src/pages/Record/z-Detail/ToTransaction.tsx`, `src/pages/Record/z-Detail/index.tsx`, `src/pages/Record/z-Detail/use-delete.ts`
- **Iteration:** 6

## Summary

The record detail pane still ships a permanently disabled "Jadikan Transaksi" button, and `use-delete.ts` exports a `programDeleteRecord` whose only documented callers (`Shop/z-Complete`, `Stock-PENDING/z-Complete`) were deleted. Both comments describe the removed Shop surface as if it were live, which is exactly what stops the next reader from deleting the dead code.

## Details

## Evidence

The record detail pane ships a permanently disabled action with no explanation:

```tsx
// src/pages/Record/z-Detail/ToTransaction.tsx:1-15
/**
 * Held rather than removed: pushing a past record back into the shop cart needs
 * the cart (`tx.db`) rebuilt on the services layer, and `/shop` is not routed
 * in the meantime.
 */
export function ToTransaction() {
  return (
    <div className="flex flex-col items-end gap-1">
      <Button disabled variant="secondary">Jadikan Transaksi</Button>
    </div>
  );
}
```

It is rendered on every record: `src/pages/Record/z-Detail/index.tsx:137`, in the footer
next to "Lihat" and the admin-only delete button, i.e. one of the three actions of the
pane. The comment names `/shop` and `tx.db` — both long gone (`.agent/agent.md`: the shop
pages, `~/database` and `tx.db` were deleted; the cart lives in `data.db` since migration
43). There is no tooltip, no "belum tersedia" copy, no `title`, so the only thing the
cashier/owner learns is that a button exists and does not work.

The same leftover is exported as dead code:

```ts
// src/pages/Record/z-Detail/use-delete.ts:22-36
/**
 * Imperative form for the two rollback hooks that undo a committed cart
 * (`Shop/z-Complete`, `Stock-PENDING/z-Complete` — both still unmigrated). Kept
 * as a function rather than only a hook because both call it outside React.
 */
export function programDeleteRecord(id: string): Effect.Effect<string | null> {
  return service.record.delete.byId(id).pipe(...)
}
```

`rg programDeleteRecord src` returns exactly one hit: the definition. Both callers it
documents do not exist — `src/pages/Shop/` and `src/pages/Stock-PENDING/` are not in the
tree (only `Pos/Draft/z-Customer.tsx:11` and the cart's own `z-Complete` remain of that
family, and neither imports it). So a reader is told the function is load-bearing by callers
that are deleted, and the "put a record back into the cart" feature has a dead half in the
UI and a dead half in the service layer.

## Why it matters

Two costs. The small one is user-facing: a disabled button on the record screen is a
support question ("kenapa tidak bisa diklik?") with no answer in the app, and it makes the
finished delete/print flows look equally unfinished. The larger one is maintenance:
`programDeleteRecord`'s comment is a confident, wrong statement about who calls it, which
is exactly the kind of comment that talks the next engineer out of deleting dead code — and
it does the thing `.agent/agent.md` warns about, documenting an API in terms of paths that
were removed on purpose.

## Recommended fix

1. Either delete `ToTransaction` and its render site, or replace it with an honest
   affordance: if the feature is still planned, render nothing until it works, or render a
   disabled button with `title="Belum tersedia"` and a `Show when={role === "admin"}`
   gating. Do not leave a bare disabled button in the footer.
2. Delete `programDeleteRecord` (no callers) — the hook `useDelete` in the same file
   already covers the panel's real delete path, and the rollback path is
   `service.transaction.unsubmit` (`z-Complete.tsx:78`).
3. When you delete them, delete the stale comments with them; if the feature is deferred,
   record it in `specification.xml`/the issue tracker rather than in a doc comment that
   names removed modules.

## Acceptance criteria

- `rg "ToTransaction|programDeleteRecord" src` → zero hits, or `ToTransaction` renders only
  an explanation the user can read (title/tooltip/label) and the comment references no
  deleted module.
- No comment under `src/` names `Shop/`, `Stock-PENDING/`, `tx.db` or `~/database` as a live
  dependency (a cheap `rg` check in CI would keep it true).
- The record detail footer shows only working actions.

## Verification

- `rg -n "Shop/|Stock-PENDING|tx\.db" src` — only historical "was removed" notes remain.
- `bun run typecheck && bun run lint` after the deletion.
- Manual: open any record from Records → the footer has no dead button.
