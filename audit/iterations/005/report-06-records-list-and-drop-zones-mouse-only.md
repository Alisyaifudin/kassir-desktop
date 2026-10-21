---
slug: records-list-and-drop-zones-mouse-only
title: "The Records list and the three import drop zones cannot be operated from the keyboard"
severity: medium
category: accessibility
iteration: 5
created: 2026-10-21T19:53:55.328Z
files:
  - "src/pages/Record/z-Record/List.tsx"
  - "src/pages/Record/page.tsx"
  - "src/pages/Setting/Data/ProductUpload/index.tsx"
  - "src/pages/Setting/Data/RecordUpload/index.tsx"
  - "src/pages/Money/History/z-UploadDialog/z-Content.tsx"
---

# The Records list and the three import drop zones cannot be operated from the keyboard

- **Severity:** medium
- **Category:** accessibility
- **Files:** `src/pages/Record/z-Record/List.tsx`, `src/pages/Record/page.tsx`, `src/pages/Setting/Data/ProductUpload/index.tsx`, `src/pages/Setting/Data/RecordUpload/index.tsx`, `src/pages/Money/History/z-UploadDialog/z-Content.tsx`
- **Iteration:** 5

## Summary

The Records list — the only way to open a record's detail pane — is a `<TableRow onClick>` with no `tabIndex`, `role`, `aria-selected` or key handler, so the screen is unusable without a mouse in an app whose whole point is keyboard-first operation; the selection is also signalled by background colour only. The same gap repeats in the three file-drop zones (Setting → Data product/record import, Money → History upload), whose drop target is a click-only div over a `hidden` file input.

## Details

## Evidence

**1. The Records list is mouse-only.** `src/pages/Record/z-Record/List.tsx:74-87`:

```tsx
<TableRow
  onClick={() => setSelected(record.id)}
  className={cn({ "bg-sky-200 …": selected === record.id }, …)}
>
```

No `tabIndex`, no `role`, no `aria-selected`, no key handler. The row is the only
way to choose which record the right-hand pane shows, and the pane is empty until
one is chosen (`src/pages/Record/page.tsx:60`: `{selected === null ? null : <Detail … />}`),
so a keyboard-only operator sees a list of sales and a blank detail pane with no
way to bridge them. The neighbouring tables already do this correctly —
`src/pages/Product/z-ProductTable.tsx:66-77` and
`src/pages/Debt/z-DebtTable.tsx:73-83` use `<Link>`s, which are focusable and
Enter-activated.

Contrast with the rest of the app, which is deliberately keyboard-first: a grid
selection model with arrow keys in `components/cart/z-Listing.tsx` and
`z-Methods.tsx`, `F1`/`F2`/`F12`, `Ctrl+Arrow` tab walking, `Alt+digit` navigation
(`layouts/authenticated/use-navigation-shortcuts.ts`). Records is the screen where
the keyboard stops working.

**2. Three file-drop zones are click-only.** The drop target is a `<div>` with
`onClick` and no `role`/`tabIndex`/`onKeyDown`, over an input hidden from the
accessibility tree:

- `src/pages/Setting/Data/ProductUpload/index.tsx:118-137`
- `src/pages/Setting/Data/RecordUpload/index.tsx:118-137`
- `src/pages/Money/History/z-UploadDialog/z-Content.tsx:114-133`

Each renders `<input type="file" … className="hidden" />` inside a clickable div,
so Tab never reaches it and Enter does nothing. The copy says "Jatuhkan berkas di
sini atau klik" — there is no keyboard equivalent of "klik".

## Why it matters

The app's stated design target is a POS terminal where the operator may have no
mouse at hand, and the audit brief lists "keyboard-only operation" and
"screen-reader names" as first-class expectations. The Records screen is the one
used for after-the-fact reconciliation (checking a sale, printing a receipt,
fixing a credit), and reading one record currently requires a pointing device. The
import paths are admin-only, but they are also the paths where a mis-click is most
expensive — and they cannot be started at all from the keyboard.

Secondary: because the rows carry no `role="row"`-level selection state, a
screen-reader user gets no announcement of which record the detail pane is
showing; `bg-sky-200` is the only signal, i.e. colour-only status.

## Recommended fix

1. Make the record row a real control: either
   - `<TableRow>` → `<Link>`/`<button>` wrapper on the row's first cell with the
     row visually still a row (`<Link className="block">`), or
   - keep the row and add `tabIndex={0}` + `role="button"` +
     `aria-pressed={selected === record.id}` + `onKeyDown` for Enter/Space.
   Add `aria-selected` and use a border/ring in addition to the tint so the
   selection is not colour-only.
2. Give the Records list the same arrow-key walk the grids have: `Up`/`Down`
   move the selection, `Enter` opens the record — this matches the POS mental
   model the operator already has.
3. For the three drop zones: keep the visual, but make the `<input type="file">`
   reachable — wrap the target in `<label>` (a label wrapping a file input is
   natively keyboard-activatable) or move the hidden input out of `hidden` into a
   `sr-only` position with a `<label htmlFor>` "Pilih berkas" button.
4. Add each of these to the existing `src/components/ui/icon-buttons.test.ts`
   style source-scan guard, or better a render test (see the testing report)
   asserting `getByRole("button")`/`getByRole("row")` focusability.

## Acceptance criteria

- Without a mouse: Tab to the Records list, arrow to a row, Enter opens its
  detail; the focused/selected row is visibly distinct without relying on hue.
- `getByRole("row", { selected: true })` (or `aria-pressed`) resolves to the
  active record.
- Each upload zone can be opened with Tab + Enter/Space, and announces a name.
- No regression in the POS grids' existing keyboard model.

## Verification

- Playwright (the harness already boots the real app, `e2e/harness.ts`): focus
  `body`, press Tab until the record list has focus, press ArrowDown twice and
  Enter; assert the detail pane shows the second record.
- `page.keyboard.press("Enter")` on the focused drop zone in Setting → Data and
  assert the file chooser event fired (Playwright's `filechooser` promise).
- axe-core run on `/records` with the list focused: no "interactive element not
  focusable" / "no accessible name" violations.
