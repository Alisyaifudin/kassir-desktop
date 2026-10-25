---
slug: cart-shortcuts-fire-behind-open-dialogs
title: "F1/F2/F12 keep firing while a cart dialog is open, so F12 writes a new draft behind the completion dialog and strands modals over a different cart"
severity: medium
category: react
iteration: 7
created: 2026-10-21T20:44:47.717Z
files:
  - "src/components/cart/use-cart-screen.ts"
  - "src/components/cart/z-Complete.tsx"
  - "src/components/cart/z-Discount.tsx"
  - "src/components/cart/z-Methods.tsx"
  - "src/components/cart/use-inert-app.ts"
  - "src/components/cart/z-Listing.tsx"
---

# F1/F2/F12 keep firing while a cart dialog is open, so F12 writes a new draft behind the completion dialog and strands modals over a different cart

- **Severity:** medium
- **Category:** react
- **Files:** `src/components/cart/use-cart-screen.ts`, `src/components/cart/z-Complete.tsx`, `src/components/cart/z-Discount.tsx`, `src/components/cart/z-Methods.tsx`, `src/components/cart/use-inert-app.ts`, `src/components/cart/z-Listing.tsx`
- **Iteration:** 7

## Summary

The page-level F1/F2/F12 handler in `useCartScreen` is registered on `window` and guarded only by `submitting`, so it keeps firing while a cart dialog owns the screen — `inert` on `#root` does not stop window listeners, and the dialogs are portaled outside it. F12 during the "Pembayaran berhasil" dialog writes an extra empty draft to SQLite; F12 with the discount editor open replaces the cart under it and strands an empty "Diskon" modal; F1 resets the grid selection behind the overlay. The adjacent "always one cart" effect guards on `complete !== null`, so the intent exists — the shortcut was just left out of it.

## Details

## Evidence

`src/components/cart/use-cart-screen.ts:109-141` installs the screen's global
shortcuts. The only guard is `submitting`:

```ts
// F1/F2/F12 work from anywhere on the screen, not just from the focused panel.
useEffect(() => {
  function handleKeyDown(event: KeyboardEvent) {
    if (submitting) return;               // ← the only guard
    if (event.key === "F1") { event.preventDefault(); … focusSearchNow(); return; }
    if (event.key === "F2") { event.preventDefault(); onF2?.(); return; }
    if (event.key === "F12") { event.preventDefault(); startNew(); }
  }
  window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);
});
```

Nothing in it knows whether a cart dialog is open. The three dialogs and the one
overlay it can collide with:

* `src/components/cart/z-Complete.tsx` — the post-commit "Pembayaran berhasil"
  dialog (a real modal, Radix-trapped);
* `src/components/cart/z-Discount.tsx:82` and `src/components/cart/z-Methods.tsx:105` —
  both `useInertApp(open)`, i.e. they deliberately make `#root` inert because
  they run `modal={false}`.

`inert` removes the app shell from focus and pointer events, but it does **not**
stop a `keydown` listener registered on `window`; the dialogs are portaled to
`<body>`, outside `#root`, so their keys bubble to `window` normally. Three
concrete consequences:

1. **F12 during / after a commit creates a cart nobody asked for.**
   `startNew()` (`:103-107`) calls `service.transaction.add.new(mode)` and then
   `onDraft(id)` — an actual `tx_records` INSERT plus a new tab. Press F12 while
   "Pembayaran berhasil" is on screen and a second empty draft is written; then
   `Batalkan` restores the cancelled sale as a third. The neighbouring effect
   already guards this exact state (`:181-206` returns early on
   `complete !== null`), so the author knew — the shortcut simply was not
   included.
2. **F12 with the discount editor open strands a modal on a different cart.**
   The draft under the dialog is replaced, so `discountFor` no longer matches any
   line: `z-Discount.tsx:127-133` renders `line !== null ? <Body …/> : null`, and
   the operator is left with an empty "Diskon" dialog over a cart they did not
   choose.
3. **F1 with either money editor open moves the grid's selection behind the
   overlay.** `focusSearchNow()` bumps the token, `z-Listing.tsx:193-201` runs
   `setSelection({row: HEADER, …})` and `input?.focus()`; the focus call is a
   no-op inside an inert subtree, but the selection reset is not — so when the
   dialog closes the grid is parked on the header cell instead of where the
   operator was, and the `Ctrl+Arrow` tab walker (`:219-247`) can move the cart
   under an open dialog.

## Why it matters

The F2/F1/F12 vocabulary is the core of this app's keyboard model, and all three
are wired to act on a screen that a modal already owns. The damage is bounded
(modals in this app never lose data — cart edits are persisted per draft), but
each case leaves state the operator did not ask for: an extra `tx_records` row,
an empty modal, a jumped selection. On a POS, "an extra empty cart appeared after
I pressed a key" costs the cashier a delete-confirmation in the middle of the next
sale.

It also undermines the two iteration-6 fixes that made these dialogs safe:
`useInertApp` and the `modal={false}` workaround hold the *pointer and focus* in,
while a global listener walks straight past both.

## Recommended fix

Give the shortcut effect a notion of "a dialog owns the screen", and stop acting
on the shortcut that makes no sense there:

1. Make `useInertApp` (or a new `useModalOwner()` hook) publish the open state —
   a tiny module-level store (`@xstate/store` `createAtom`, already a dependency
   and already used by `use-shortcut.ts`) or a React context at the cart frame —
   and have `useCartScreen` read it: `if (submitting || modalOpen) return;` for
   **F1 and F12**, while still allowing F2 only when no dialog is open. The
   completion dialog is a normal modal, so also register its open state in the
   same store.
2. Cheaper stopgap if you prefer not to add state: bail out when the app shell is
   inert or a modal is mounted —
   `if (document.getElementById("root")?.hasAttribute("inert")) return;` plus
   `if (document.querySelector('[aria-modal="true"]')) return;`. One line, and it
   covers all three dialogs today.
3. Keep `Tabs`' `+` button and `startNew` consistent: whatever guards the
   shortcut should guard the button (it is already unreachable behind a modal,
   which is exactly the asymmetry to remove).

## Acceptance criteria

- With the completion dialog open, no key creates a draft (assert
  `transaction.add.new` is not called) and the dialog is the only modal.
- With the discount editor or the payment editor open, F1 and F12 do nothing; F2
  does nothing; the focused element does not change.
- When no dialog is open, F1/F2/F12 behave exactly as today (the existing
  `use-submit-cart.test.ts` / `z-Extras.test.tsx` cases stay green).

## Verification

New `src/components/cart/use-cart-screen.test.ts` (also requested in the testing
report): dispatch `keydown` for F12/F1 with the dialog-open flag set and assert
the spies are not called. Manual: `#/pos`, commit a sale, press F12 with
"Pembayaran berhasil" on screen, check `Pengaturan → Log`/the tab strip for an
extra draft.
