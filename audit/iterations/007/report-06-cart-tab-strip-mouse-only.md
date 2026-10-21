---
slug: cart-tab-strip-mouse-only
title: "The cart tab strip is mouse-only: tabs aren't focusable, and the `Ctrl+Arrow` that is the only keyboard path is never shown"
severity: medium
category: accessibility
iteration: 7
created: 2026-10-21T20:43:20.028Z
files:
  - "src/components/cart/z-Tabs.tsx"
  - "src/components/cart/use-cart-screen.ts"
  - "src/pages/Pos/Draft/index.tsx"
---

# The cart tab strip is mouse-only: tabs aren't focusable, and the `Ctrl+Arrow` that is the only keyboard path is never shown

- **Severity:** medium
- **Category:** accessibility
- **Files:** `src/components/cart/z-Tabs.tsx`, `src/components/cart/use-cart-screen.ts`, `src/pages/Pos/Draft/index.tsx`
- **Iteration:** 7

## Summary

Recurring (noted in iteration 6's verdict, never filed): the cart tab strip's tabs are plain `<div onClick>` with no `tabIndex`, no `role="tab"`/`tablist`, no `aria-selected` and no key handler; the only focusable descendants are their `X` close buttons, so Tabbing the POS cart walks a row of delete buttons. The only keyboard way to switch carts is `Ctrl+Arrow`, which is implemented but shown nowhere — the strip advertises `F12` and nothing else, on the screen where switching carts is a daily action.

## Details

## Evidence

`src/components/cart/z-Tabs.tsx` draws the open carts. Each tab is a plain
`<div>` with a click handler — `Tab` at `:117-206`, and both branches are the
same:

```tsx
// :129-141 (a parked cart)
<div
  onClick={onSelect}
  title={`Transaksi tersimpan ${number}`}
  className={cn("flex shrink-0 cursor-pointer items-center gap-1 …")}
>

// :169-175 (an open cart)
<div
  onClick={onSelect}
  className={cn("flex shrink-0 cursor-pointer items-center gap-2 …")}
>
  <span className="max-w-[160px] truncate text-small font-medium select-none">{draft.title}</span>
  …
```

- no `tabIndex`, no `role="tab"`, no `aria-selected`, no `onKeyDown` on either;
- the strip container (`:71-88`) has no `role="tablist"` and no accessible name;
- the only focusable things inside a tab are its `X` close button — so Tabbing
  through the cart walks *the close buttons* of every open cart, and pressing
  Enter on one deletes a draft while the tab itself can never be activated.

The one keyboard path that does work is undiscoverable: `useCartScreen` binds
`Ctrl/Cmd+ArrowLeft/Right` (`src/components/cart/use-cart-screen.ts:219-247`) and
deliberately leaves it out of the grid handlers
(`z-Listing.tsx:479`, `z-Extras.tsx:321`, `z-Methods.tsx:304`). Nothing on screen
says so: the strip shows a `Kbd` hint for `F12` only (`:74`), and
`src/lib/constants.ts` / the Alt-legend in `use-navigation-shortcuts.ts` list the
screen shortcuts, not the cart tabs.

This is the recurring item from iteration 6's verdict ("the cart tab strip has no
`role="tablist"`/`role="tab"` and its tabs are not focusable") — it was noted but
never filed, and the code is unchanged.

## Why it matters

The two cart screens exist to be driven without a mouse: F1 focuses search, F2
settles, F12 opens a tab, arrows walk a grid. Every one of those is shown on
screen with a `Kbd` chip. Switching between carts — the thing a cashier does when
a second customer is waiting — is the one action with no keyboard affordance at
all, on the screen where the money is.

The failure mode is not "a screen reader user can't label the tab"; it is that a
keyboard user who Tabs looking for the tab strip finds a row of delete buttons
instead, and a mis-aimed Enter destroys a half-finished sale (the dialog does
confirm, but the tab was never reachable on purpose).

## Recommended fix

Minimum, in `z-Tabs.tsx`:

1. `<div role="tablist" aria-label="Transaksi terbuka">` on the strip container.
2. Give `Tab` `role="tab"`, `aria-selected={selected}`, `tabIndex={selected ? 0 : -1}`,
   and `onKeyDown` handling `Enter`/`Space` (select), `ArrowLeft`/`ArrowRight`
   (move + select, the ARIA tab pattern), `Home`/`End`, `Delete` (open the
   confirm dialog instead of closing silently).
3. Put the `X` inside the tab as `tabIndex={-1}` so it does not become a
   tab-stop of its own (or keep it focusable but ordered after the label).
4. Surface the existing shortcut: add `<Kbd>Ctrl+←/→</Kbd>` next to the `F12`
   chip so the arrow path is discoverable, and keep the handler that already
   works as a second way to do it.

## Acceptance criteria

- The cart strip is a single Tab stop; Left/Right move between open carts and
  select them; Enter/Space selects the focused one.
- Each tab announces "Transaksi <title>, tab 2 of 3, selected".
- Tabbing never lands on a delete control before the tab strip itself.
- A parked tab is reachable and restores on Enter (no mouse).
- The shortcut chip for switching carts is visible on both `/pos` and `/restock`.

## Verification

New `src/components/cart/z-Tabs.test.tsx` in the style of
`z-Extras.test.tsx`: render three drafts, dispatch `keydown` for ArrowRight and
Enter on the strip, assert `onSelect` calls; assert `getAllByRole("tab")` has the
right `aria-selected`. Then a keyboard-only pass on `#/pos` with two carts open.
