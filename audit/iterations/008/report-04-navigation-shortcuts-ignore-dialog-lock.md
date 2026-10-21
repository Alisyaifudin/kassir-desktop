---
slug: navigation-shortcuts-ignore-dialog-lock
title: "`Alt`+digit navigation and the Alt legend ignore the cart dialog lock, so the completion dialog's print/undo exits can be navigated away from"
severity: medium
category: react
iteration: 8
created: 2026-10-21T21:08:51.188Z
files:
  - "src/layouts/authenticated/use-navigation-shortcuts.ts"
  - "src/components/cart/use-inert-app.ts"
  - "src/components/cart/use-cart-screen.ts"
  - "src/components/cart/z-Complete.tsx"
---

# `Alt`+digit navigation and the Alt legend ignore the cart dialog lock, so the completion dialog's print/undo exits can be navigated away from

- **Severity:** medium
- **Category:** react
- **Files:** `src/layouts/authenticated/use-navigation-shortcuts.ts`, `src/components/cart/use-inert-app.ts`, `src/components/cart/use-cart-screen.ts`, `src/components/cart/z-Complete.tsx`
- **Iteration:** 8

## Summary

The dialog lock introduced in iteration 7 (`isScreenOwnedByDialog`) is consulted only by `useCartScreen`'s F1/F2/F12 and Ctrl+Arrow listeners. The app-wide navigator in `src/layouts/authenticated/use-navigation-shortcuts.ts` has its own `window` keydown/keyup listeners and still runs `Alt+3`/`Alt+5` and toggles the Alt shortcut legend while a cart dialog owns the screen — so from the "Pembayaran berhasil" modal a cashier can navigate away and lose the receipt print and the Batalkan/undo window that dialog exists for. The fix is one predicate call, but the predicate currently lives in `src/components/cart/`, out of reach of a layout, so the contract is enforced per-listener by memory.

## Details

## Evidence

Iteration 7 added a dialog lock so page-level shortcuts stop firing while a cart dialog owns the screen — and the fix works, but only for the listener that was filed:

```ts
// src/components/cart/use-cart-screen.ts:11
import { isScreenOwnedByDialog } from "~/components/cart/use-inert-app";
// :121  (F1/F2/F12)
if (isScreenOwnedByDialog()) return;
// :230  (Ctrl+←/→ tab walker)
if (submitting || isScreenOwnedByDialog()) return;
```

A grep for the predicate shows it is consulted **only** there:

```
src/components/cart/use-cart-screen.ts:121
src/components/cart/use-cart-screen.ts:230
```

The app-wide navigator — mounted once by the authenticated layout, so it is alive on every screen including Pos and Restock — has its own `window` listeners and never asks:

```ts
// src/layouts/authenticated/use-navigation-shortcuts.ts:5
const linkMap = { 0: "/pos", 1: "/restock", 2: "/products", 3: "/records", 4: "/money", 5: "/setting" };
// :31
function handleKey(e: KeyboardEvent) {
  if (!e.altKey || e.ctrlKey || e.metaKey) return;
  const link = linkMap[e.key] as string | undefined;
  if (link === undefined) return;
  e.preventDefault();
  showShortcut(false);
  navigate(link);            // ← no isScreenOwnedByDialog() check
}
// :41
function handleAltDown(e) { … showShortcut((prev) => !prev); }  // same gap for the Alt legend
```

Consequences, both reproducible by reading the code:

1. **The completion dialog's exits can be bypassed.** `Complete` opens a real Radix modal (`src/components/cart/z-Complete.tsx`) and registers `useDialogLock(true)` so F12/F1/F2 hold. But `Alt+3` still runs `navigate("/records")`, unmounting the dialog. The sale is already committed, so nothing is corrupted — but the cashier loses the only two things that dialog exists for: **Cetak** (the receipt never prints) and **Batalkan** (`transaction.unsubmit`, the undo window that turns the record back into an editable cart). This is the same bug class iteration 7 fixed for F12 ("F12 could add an empty draft behind the 'Pembayaran berhasil' dialog"), left open on the other listener.
2. **The Alt legend paints behind the modal.** Holding Alt with the payment/discount editor open toggles the shortcut legend (`showShortcut`) for 5 s; it renders under the overlay and under `#root` being `inert`, so it is invisible to the operator but still flickers the `aria-hidden`/inert shell.
3. Same shape, smaller: `src/layouts/authenticated/use-flush-on-exit.ts` is fine (window lifecycle), but any future `window` shortcut has no central place to consult the lock — the lock lives in `src/components/cart/`, which a layout cannot import without a layering smell (components → layouts is already the direction that exists, but the concept is not shared).

## Why it matters

The lock is a *contract* — "while a dialog owns the screen, page-level shortcuts do nothing" — and it is currently enforced per-listener, by hand. That is the same failure mode as the three duplicated submit implementations that took six audits to consolidate: the next listener added anywhere in the app will forget, and the failure is invisible (a navigation that works is not a visible bug until someone loses a printed receipt or cannot undo a mis-rung sale).

The specific loss here is real cashier-facing risk on the POS screen, which is the screen the app exists for: the "Batalkan" window is the only safety net after a mistaken Bayar.

## Recommended fix

1. **Consult the lock in `useNavigationShortcuts`** — one line in `handleKey` and one in `handleAltDown`:

   ```ts
   if (isScreenOwnedByDialog()) return;
   ```

   This needs `use-inert-app.ts` to move out of `src/components/cart/` (e.g. `src/hooks/use-dialog-lock.ts`, or `src/lib/dialog-lock.ts` for the module-level counter plus a `src/hooks/` wrapper) so a layout can import it without reaching into the cart folder. The DOM fallback (`document.querySelector('[aria-modal="true"]')`) already makes it work for dialogs that never register.

2. **Better: install one window listener.** A single `useDialogAwareShortcuts` (or a tiny `shortcuts` module with `registerShortcut({ key, run })` + `enabled` predicate) registered once in the authenticated layout, with per-screen registrations added on mount. Then "shortcuts must respect the dialog" is enforced by construction, not by nine copies of an `if`.

3. Add the regression test: render `useNavigationShortcuts` with `useDialogLock(true)` mounted (the pattern already exists in `src/components/cart/use-cart-screen.test.ts:115`), dispatch `Alt+3` / `Alt+5`, assert `navigate` was not called; and a second case asserting it *is* called when no dialog is open.

## Acceptance criteria

- With any cart dialog open (payment editor, discount editor, `Complete`), no `Alt`+digit navigates and the Alt legend does not toggle.
- With no dialog open, `Alt+0..5` still navigates and the legend still appears.
- The dialog-ownership predicate lives somewhere a layout may import (not `src/components/cart/*`), and `grep` shows every `window.addEventListener("keydown")` in `src/` either lives behind that predicate or documents why it does not need it.
- Tests cover both directions for the navigator (and continue to cover F1/F2/F12).

## Verification

- New tests in `src/layouts/authenticated/use-navigation-shortcuts.test.ts` (or extend `use-cart-screen.test.ts`'s existing dialog-lock cases): `Alt+3` blocked while `useDialogLock(true)`, allowed after it unmounts, and blocked while a `[aria-modal="true"]` element exists in the DOM.
- Manual: Pos → complete a sale → on the "Pembayaran berhasil" dialog hold `Alt` (no legend) and press `Alt+3` / `Alt+5` (no navigation) → `Cetak` and `Batalkan` behave; then close the dialog and confirm `Alt+3` navigates again.
