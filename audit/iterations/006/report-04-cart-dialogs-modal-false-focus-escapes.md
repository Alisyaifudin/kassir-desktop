---
slug: cart-dialogs-modal-false-focus-escapes
title: "The payment and discount dialogs are non-modal, so the keyboard walks straight past them into the cart"
severity: medium
category: accessibility
iteration: 6
created: 2026-10-21T20:20:49.222Z
files:
  - "src/components/cart/z-Methods.tsx"
  - "src/components/cart/z-Discount.tsx"
  - "src/pages/Pos/page.tsx"
---

# The payment and discount dialogs are non-modal, so the keyboard walks straight past them into the cart

- **Severity:** medium
- **Category:** accessibility
- **Files:** `src/components/cart/z-Methods.tsx`, `src/components/cart/z-Discount.tsx`, `src/pages/Pos/page.tsx`
- **Iteration:** 6

## Summary

The payment editor and the per-line discount editor both render `<Dialog modal={false}>` with a hand-drawn `div` overlay (to dodge a Radix focus bug). Pointer input is blocked, keyboard input is not: Tab leaves the dialog into the cart grid behind it, `aria-modal` is never set, and the background is not `inert` — so an Enter after a few Tabs edits money under an overlay. Recurring from two prior verdicts, filed now because it is a keyboard-safety issue on the money path.

## Details

## Evidence

Two of the cart's dialogs opt out of Radix's modal behaviour and draw their own overlay
instead.

Payment editor — `src/components/cart/z-Methods.tsx:501-505`:

```tsx
<Dialog modal={false} open={open} onOpenChange={setOpen}>
  {/* Radix drops its own overlay when the dialog is not modal, so draw one. */}
  <DialogPortal>
    <div className="fixed inset-0 z-50 bg-black/80" onClick={() => setOpen(false)} />
  </DialogPortal>
```

Line-discount editor — `src/components/cart/z-Discount.tsx:79-91`:

```tsx
// `modal={false}` is a workaround for a known Radix bug: with a trapped
// Dialog (React 19), the Dialog's FocusScope reclaims focus from the kind
// Select's portal, so the list never focuses. Radix's fix is unmerged, so
// we drop the trap for this editor; the overlay still blocks and dismisses.
<Dialog modal={false} open={open} onOpenChange={onOpenChange}>
  <DialogPortal>
    <div className="fixed inset-0 z-50 bg-black/80" onClick={() => onOpenChange(false)} />
  </DialogPortal>
```

With `modal={false}` Radix: keeps focus on the page (no `FocusScope` trap), does not set
`aria-modal`, does not apply `aria-hidden`/`inert` to the rest of the document, and closes
on outside *pointer* events only. The hand-drawn overlay is a `div`, so it blocks the
mouse and nothing else. The cart behind the dialog is neither `inert` nor hidden — in
`Pos/page.tsx:169` the only `inert` is for `submitting`.

Concrete consequences on the shipped screens:

- Tab from the last control in "Diskon" moves into the listing grid behind the dialog
  (`z-Listing.tsx:528`, `tabIndex={0}`), where arrow keys/Enter now edit the cart while an
  overlay covers it. Escape then closes the dialog from a different part of the app than
  the one the cashier thinks they are in.
- A screen reader is not told the dialog is modal and can walk the background content.
- The installed Radix dialog is `@radix-ui/react-dialog@1.1.10`
  (`node_modules/@radix-ui/react-dialog/package.json`), i.e. the version the comment calls
  unfixed-by-upstream; nothing in the repo pins the workaround's removal to a version or a
  test, so it will outlive the bug it works around.

## Why it matters

These are the two dialogs a cashier touches most after the cart itself: the split-payment
editor and per-line discounts. Both change money, and both are the kind of dialog where a
stray Enter from the grid behind it edits a price. On a keyboard-first POS the difference
between a modal and a non-modal dialog is not cosmetic — it decides what Enter does.

This has been noted in two previous verdicts as "the payment `Dialog` is `modal={false}`
with a hand-drawn overlay so focus is not trapped" and never filed; it is filed now
because it is a keyboard-safety issue on the money path, not a preference about overlays.

## Recommended fix

1. Restore the trap without reintroducing the Radix bug: keep `modal` (default `true`)
   and reproduce the child-select problem instead of disabling the trap —
   - use the in-dialog picker without a portal (`Select` with
     `position="popper"` still portals; a `RadioGroup`/segmented list does not), or
   - keep the portal and re-assert focus inside on the select's `onCloseAutoFocus`
     (`event.preventDefault(); fieldRef.current?.focus()`), which the discount grid already
     does for the pointer path (`z-Discount.tsx:141-152`).
2. If a trap-less dialog is genuinely required, make the rest of the app inert while it is
   open: mirror the POS pattern (`inert={submitting}`) with `inert={dialogOpen}` on the
   cart container, add `aria-modal="true"` on the content, and keep the overlay.
3. Record the workaround where a future reader will see it expire: name the upstream issue
   and the Radix version in the comment, and add a test that fails if focus can leave the
   dialog (render the dialog, press Tab N times from the last control, assert
   `document.activeElement` is still inside the content).

## Acceptance criteria

- With "Diskon" or "Metode pembayaran" open, Tab and Shift+Tab cycle inside the dialog; no
  key reaches the cart grid behind it.
- The dialog content exposes `aria-modal="true"` (or the background is `inert`), so a
  screen reader cannot walk the covered content.
- Escape closes the dialog and returns focus to the cell that opened it.
- A render test asserts focus containment for both dialogs.

## Verification

- New render test in `src/components/cart/` (happy-dom + RTL is already preloaded):
  open each dialog, Tab past the last control, assert focus stays inside.
- Manual keyboard pass: Pos → F2 → open the payment editor → Tab 10× → you never land in
  the listing grid; same for a line's Diskon.
- `bun test`, `bun run lint`, `bun run typecheck`.
