---
slug: cart-tabs-have-no-tabpanel
title: "The cart `tablist` has no `tabpanel` and no `aria-controls`, so the ARIA tabs pattern stops at the strip"
severity: medium
category: accessibility
iteration: 8
created: 2026-10-21T21:09:24.733Z
files:
  - "src/components/cart/z-Tabs.tsx"
  - "src/components/cart/z-CartFrame.tsx"
  - "src/pages/Pos/Draft/index.tsx"
  - "src/pages/Restock/Draft/index.tsx"
  - "src/components/cart/z-Tabs.test.tsx"
---

# The cart `tablist` has no `tabpanel` and no `aria-controls`, so the ARIA tabs pattern stops at the strip

- **Severity:** medium
- **Category:** accessibility
- **Files:** `src/components/cart/z-Tabs.tsx`, `src/components/cart/z-CartFrame.tsx`, `src/pages/Pos/Draft/index.tsx`, `src/pages/Restock/Draft/index.tsx`, `src/components/cart/z-Tabs.test.tsx`
- **Iteration:** 8

## Summary

The cart tab strip is a real `tablist` of `role="tab"` elements (iteration 7), but there is no `role="tabpanel"` anywhere in the repo and no tab carries `aria-controls` or an `id`. The content the tabs switch — `StageBody` and the settle strip — is plain markup, so a screen reader in tabs mode is told a tab is selected and offered panel navigation that leads nowhere, and a cashier switching carts is never told that the cart body below was replaced. `z-Tabs.test.tsx` covers the widget but cannot cover the (missing) association.

## Details

## Evidence

Iteration 7 converted the cart tab strip to the ARIA tabs pattern. The widget half is there — the list, the tabs, selection, roving tabindex, arrows/Home/End, Enter/Space, Delete — but the *panel* half is missing entirely:

```tsx
// src/components/cart/z-Tabs.tsx:124-129
<div ref={listRef} role="tablist" aria-label="Transaksi terbuka" className="flex flex-1 items-center gap-1 overflow-x-auto">
  {drafts.map((draft, index) => (
    <Tab … />
```

```tsx
// src/components/cart/z-Tabs.tsx:195-200
<div
  role="tab"
  aria-selected={selected}
  aria-label={`Transaksi ${title} (${number} dari ${total})`}
  tabIndex={selected ? 0 : -1}
```

There is no `id` on the tab, no `aria-controls`, and a repo-wide search finds no panel at all:

```
$ grep -rn "tabpanel\|aria-controls" src
src/components/ui/combobox.tsx:148:  aria-controls={open ? listId : undefined}
```

The content the tabs actually switch — `<StageBody>` in `src/pages/Pos/Draft/index.tsx:66` (and the Restock mirror), plus the settle strip in `src/pages/Pos/z-Bottom.tsx` — is a plain `<section>`/`<div>` with no `role="tabpanel"` and no `aria-labelledby`. `CartPanels` (`src/components/cart/z-CartFrame.tsx`) is likewise unlabelled.

So a screen reader is told "Transaksi Kopi, tab, 1 of 3, selected" with no relationship to anything, and the content below it is announced as ordinary page content that never references the tab. There is also nothing for `aria-controls` to point at, which is why pressing Enter/Arrow announces a selection but gives no cue that the region below changed.

`src/components/cart/z-Tabs.test.tsx` covers tablist semantics, one tab stop, arrows, Enter, parked carts and Delete — but not the panel association (it cannot, since none exists).

## Why it matters

- **The ARIA tabs pattern is only half-implemented**, which is worse for AT users than a plain list of buttons: a `tablist` promises that the tabs control a panel, and a screen reader in "tabs" mode then offers panel navigation (Ctrl+Tab on some AT, `aria-controls` announcements on NVDA) that leads nowhere.
- Switching carts is the POS's core multi-sale affordance. A blind or low-vision cashier selects the tab but is not told that the cart body, the stage and the payment strip below have been replaced, so they must re-explore the page from the top every time.
- It is cheap to get right and the fix is local: `id` on the tab, `aria-controls` on the tab, `role="tabpanel"` + `aria-labelledby` + `tabIndex={0}` on the container that changes.

## Recommended fix

1. Give each tab an id derived from the draft it represents (`id={`cart-tab-${draft.id}`}`) and point it at the shared panel:

   ```tsx
   <div role="tab" id={`cart-tab-${draft.id}`} aria-controls="cart-panel" … >
   ```

2. Wrap the content the tabs switch in a labelled panel. On both screens the tab controls the whole transaction body, so the natural place is around the stage body in `Draft`/`Payment`, or around `CartPanels`' children plus the settle strip if the tab is treated as owning the whole screen:

   ```tsx
   <div role="tabpanel" id="cart-panel" aria-labelledby={`cart-tab-${draft.id}`} tabIndex={0} className="flex min-h-0 flex-1 flex-col">
     …
   </div>
   ```

3. Because the panel is large and contains its own keyboard model (the grid), `tabIndex={0}` on the panel is the pattern's "no focusable content at the start" fallback — here the grid *is* focusable, so `tabIndex={-1}` plus `aria-labelledby` is acceptable; pick one and say why in the comment.

4. Extend `z-Tabs.test.tsx`: after ArrowRight, `document.getElementById("cart-panel")` must have `aria-labelledby` equal to the newly selected tab's id, and exactly one `[role="tabpanel"]` must exist.

## Acceptance criteria

- Exactly one `role="tabpanel"` exists while the cart screen is mounted; its `aria-labelledby` names the selected tab.
- Every `role="tab"` carries `aria-controls` pointing at that panel and a unique `id`.
- Switching carts (click, Arrow, Ctrl+Arrow, parked-cart restore) updates `aria-labelledby` to the new tab.
- The existing tab-strip tests (one tab stop, arrows, Enter, Delete, X out of the tab order) keep passing.

## Verification

- `bun test src/components/cart/z-Tabs.test.tsx` with the new panel-association cases.
- Manual with a screen reader on `/pos` with two carts: Tab to the strip, ArrowRight to the second cart, and confirm the panel is announced as the second cart's panel; then verify the same in `/restock`.
