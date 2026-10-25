---
slug: cart-url-state-pushes-history-entries
title: "Cart navigation pushes a history entry per keystroke-level action, so Back can switch the sale being rung up"
severity: medium
category: react
iteration: 3
created: 2026-10-21T18:48:57.132Z
files:
  - "src/pages/Pos/use-draft.ts"
  - "src/pages/Pos/use-stage.ts"
  - "src/pages/Pos/page.tsx"
  - "src/pages/Restock/page.tsx"
  - "src/pages/Restock/use-stage.ts"
  - "src/pages/Restock/use-draft.ts"
---

# Cart navigation pushes a history entry per keystroke-level action, so Back can switch the sale being rung up

- **Severity:** medium
- **Category:** react
- **Files:** `src/pages/Pos/use-draft.ts`, `src/pages/Pos/use-stage.ts`, `src/pages/Pos/page.tsx`, `src/pages/Restock/page.tsx`, `src/pages/Restock/use-stage.ts`, `src/pages/Restock/use-draft.ts`
- **Iteration:** 3

## Summary

`useDraftId` and `useStage` write the open cart and the stage into the URL with `setSearchParams(…, no options)`, which React Router 7 turns into a `navigate` push. Every tab switch, stage toggle, F12 and park therefore adds a history entry, so Back / Alt+Left / a mouse back button rewinds through `?draft=` states instead of leaving the Pos screen — and because the screen resolves `?draft=` via `find(id) ?? normalDrafts[0]`, going back can silently put a *different* open cart under the cashier's cursor mid-sale.

## Details

## Evidence

The Pos and Restock screens keep their UI state (`?draft=`, `?stage=`) in the URL. Both hooks write it with `setSearchParams` and no options:

`src/pages/Pos/use-draft.ts`:

```ts
export function useDraftId() {
  const [search, setSearch] = useSearchParams();
  const id = search.get("draft");
  const setId = useCallback(
    (id: string | null) => {
      setSearch((old) => {          // <- no { replace: true }
        const next = new URLSearchParams(old);
        if (id === null) next.delete("draft");
        else next.set("draft", id);
        return next;
      });
    },
    [setSearch],
  );
  return [id, setId] as const;
}
```

`src/pages/Pos/use-stage.ts` (identical shape, `s.set("stage", stage)`).

React Router 7 pushes by default — `node_modules/react-router/dist/development/chunk-4WY6JWTD.mjs:10037`:

```js
      hasSetSearchParamsRef.current = true;
      navigate("?" + newSearchParams, navigateOptions);
```

`navigateOptions` is `undefined` here, so it is a **push**.

Every one of these is a push on the Pos screen:

* `setDraftId` on a tab click (`Pos/page.tsx` `openDraft`, `storeCart`, `onRestored`), on F12 (`service.transaction.add.new(...).then(onDraft)`), and when the last tab is gone (`onDraft(null)`);
* `setStage` on the Tambahan/Produk stage toggle, on the `activeId` effect (`handleStage.current("listing")`), and on F1 out of the payment stage in Restock.

So a normal sale — open a tab, add a line, toggle to Tambahan, back to Produk, switch to a second parked cart, return — leaves a dozen history entries, each a hash-route state with a **draft id** in it.

The Back button (and Alt+Left, and a mouse back button, which Windows mice have) therefore does not leave the Pos screen: it rewinds through `?stage=…`/`?draft=…` states. Two consequences beyond nuisance:

1. **It can silently switch the cart being rung up.** `Screen` computes `active = normalDrafts.find((draft) => draft.id === draftId) ?? normalDrafts[0] ?? null`. Going back to a `?draft=` id from earlier re-points the whole screen — lines, prices, payment rows — at a *different* open cart, with no confirmation. The `activeId` effect then also resets the stage to `listing` and steals focus into the new grid, mid-transaction.
2. **`Restock/page.tsx` has the same hooks** (`useStage`, `useDraftId`), so a purchase can be switched the same way.

## Why it matters

This is a POS: the operator's hands are on the keyboard, and the app has deliberately bound F-keys and arrows into a grid. Making browser history the undo stack for cart navigation means one stray Alt+Left (or a mouse's back thumb button — Alt+Left is literally the Windows shortcut) puts a different transaction under the cashier's cursor while the cashier keeps typing. That is a money bug, not a navigation nit, and it is invisible in tests because nothing exercises `history.back()`.

The state belongs in the URL — refresh and "share a link" are real requirements documented in the file headers — but *transient UI state* changes should replace the current entry, not push a new one. Only an explicit navigation (opening the record detail, leaving the screen) deserves a new entry.

## Recommended fix

1. Pass `{ replace: true }` in both hooks:
   ```ts
   setSearch((old) => { … }, { replace: true });
   ```
   This keeps refresh/share working (the URL still carries `?draft=`/`?stage=`) while leaving exactly one history entry for the screen.
2. Audit the other `setSearch` callers for the same shape — `rg "setSearch\(|setSearchParams\(" src`: any that write *derived/transient* state should replace, any that encode a user navigation should push.
3. Optional hardening (defence in depth): in `Screen`, treat a `draftId` that is not in `normalDrafts` as `null` rather than falling back to `normalDrafts[0]`, so a stale id can never silently select a cart the operator did not choose. Today `find(...) ?? normalDrafts[0]` means "the URL says cart A, so show cart B" with no signal.
4. Consider a route-level guard (`useBlocker`) only if a real navigation-away risk remains after (1); do not block Back wholesale — with `replace` there is nothing to block.

## Acceptance criteria

- Toggling stages, switching tabs, parking a cart and pressing F12 leave the router history depth unchanged (assert via `window.history.length` in an e2e test, or by spying on `navigate`).
- Pressing Back from `/pos` leaves the Pos screen (goes to the previous *page*), and never changes which draft is displayed.
- `?draft=<id>` still survives a reload and still opens the same cart; `?stage=` still survives a reload.
- A stale `?draft=` id (a cart that was submitted or deleted) renders an empty/new cart, not some other open cart.

## Verification

- e2e (`e2e/pos-cart.e2e.ts` harness already boots the real router): open `/pos`, record `history.length`, add a line, toggle stage twice, press F12, assert `history.length` is unchanged.
- e2e: `page.goBack()` from a `/pos` URL with `?draft=` set, assert the URL no longer matches `/pos` (i.e. it left the screen) or at minimum that the visible cart did not change.
- Manual: on Windows, press Alt+Left while a cart is open and confirm nothing changes.
- `bun run typecheck && bun run lint && bun test` green.
