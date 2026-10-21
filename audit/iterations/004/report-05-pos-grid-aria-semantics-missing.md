---
slug: pos-grid-aria-semantics-missing
title: "The POS and Restock grids declare `role=\"grid\"` without rows or gridcells, and icon buttons ship unnamed"
severity: medium
category: accessibility
iteration: 4
created: 2026-10-21T19:20:47.237Z
files:
  - "src/pages/Pos/Draft/z-Listing.tsx"
  - "src/pages/Restock/Draft/z-Listing.tsx"
  - "src/pages/Pos/Draft/z-Extras.tsx"
  - "src/components/cart/z-Methods.tsx"
  - "src/components/cart/z-ListingCard.tsx"
  - "src/pages/Setting/Data/z-Skipped.tsx"
  - "src/pages/Setting/Data/ProductUpload/z-Selected.tsx"
---

# The POS and Restock grids declare `role="grid"` without rows or gridcells, and icon buttons ship unnamed

- **Severity:** medium
- **Category:** accessibility
- **Files:** `src/pages/Pos/Draft/z-Listing.tsx`, `src/pages/Restock/Draft/z-Listing.tsx`, `src/pages/Pos/Draft/z-Extras.tsx`, `src/components/cart/z-Methods.tsx`, `src/components/cart/z-ListingCard.tsx`, `src/pages/Setting/Data/z-Skipped.tsx`, `src/pages/Setting/Data/ProductUpload/z-Selected.tsx`
- **Iteration:** 4

## Summary

The keyboard-first cart grids declare `role="grid"` with `aria-activedescendant`, but no `role="row"`/`role="gridcell"` exists anywhere in `src/`, so the active descendant points at roleless divs and the whole ARIA grid is inert — worse than no role, because AT enters a table it cannot navigate. Several icon-only buttons (dismiss, cancel upload, delete row/payment) are also nameless or named only by `title`, which screen readers do not reliably announce.

## Details

## Evidence

The keyboard-first POS grid declares ARIA roles and relationships it does not implement.

`src/pages/Pos/Draft/z-Listing.tsx:512-520` (the same shape is at `src/pages/Restock/Draft/z-Listing.tsx`, `src/pages/Pos/Draft/z-Extras.tsx:341`, `src/pages/Restock/Draft/z-Extras.tsx` and `src/components/cart/z-Methods.tsx:330-332`):

```tsx
<div
  ref={containerRef}
  tabIndex={0}
  role="grid"
  aria-activedescendant={activeId}
  onKeyDown={handleKeyDown}
  ...
>
```

- `rg 'role=' src/components/cart src/pages/Pos/Draft` returns exactly three values: `role="grid"`, one `role="alert"` (`z-StartError.tsx`), and nothing else. There is **no `role="row"` and no `role="gridcell"` anywhere**, so the grid has no accessible children: assistive tech announces "grid" and then nothing, and arrow movement is never announced.
- `aria-activedescendant={activeId}` points at ids produced by `z-Cell.tsx`/`z-ListingCard.tsx` (e.g. `` `line-${line.id}-${field}` ``) which are plain `<div>`s with no role and no `aria-selected`. Per the ARIA spec the active-descendant must reference an element with a supported role, so this attribute is ignored.
- `z-ListingCard.tsx` is the only place with a name on an icon action (`aria-label="Hapus baris"`, line 127). Elsewhere the delete/dismiss buttons are icon-only and either named only by `title` (`components/cart/z-Methods.tsx:534-542` "Hapus pembayaran", `Pos/Draft/z-Tabs.tsx:179` "Tutup …") or **not named at all**:
  - `pages/Setting/Data/z-Skipped.tsx:27-33` — `<Button variant="ghost" size="icon"><X className="w-4 h-4" /></Button>`, no text, no `title`, no `aria-label`;
  - `pages/Setting/Data/ProductUpload/z-Selected.tsx:91-97` — same pattern (cancel upload);
  - `pages/Setting/Data/RecordUpload/z-Selected.tsx:88`, `pages/Setting/Data/ProductUpload/z-Schema.tsx:34`, `pages/Restock/Draft/z-Images.tsx:103`, `pages/Product/z-ProductGrid.tsx:45`, `pages/Product/Detail/Info/History/z-HistoryTable.tsx:42`, `pages/Debt/z-DebtTable.tsx:78`.

`title` is a fallback in the accessible-name computation, not a guarantee (many screen readers ignore it, and it never appears on touch), so a `title`-only button is at best half-named.

## Why it matters

This is a POS whose entire design premise is keyboard operation — F1 to search, arrows through the grid, F2 to pay, Tab past `Manual`. The user who most needs an accessible name and an announced cell is exactly the operator who cannot use a mouse. Today the app ships `role="grid"` on a div with unlabelled divs inside, which is worse than no role at all: a screen reader enters what it believes is a table with zero rows and no longer announces the plain text it would otherwise have read. The unnamed icon buttons are blockers in the two import/cleanup dialogs (dismiss, cancel upload, delete row) where a mistake costs a file the owner just selected.

The typography side of the UI conventions is now enforced by `src/lib/design-tokens.test.ts` (no fixed text sizes, no `text-tiny`), so this is the remaining convention gap in the component layer.

## Recommended fix

1. **Give the grids real structure.** In `z-ListingCard.tsx`, `z-Extra.tsx` and the header `<div className="grid shrink-0 grid-cols-12 border-b">`, add `role="row"` to the row wrapper and `role="gridcell"` + `aria-selected={selected === field}` to every focusable cell (the elements that already carry `id={activeId}`). Keep the roving `aria-activedescendant` — that part is right once the targets have roles.
2. **Name every icon button.** Add `aria-label` (Indonesian, matching the `title` where one exists) to each `size="icon"` button from the list above; keep `title` as the tooltip. Ten lines of change, no behaviour change.
3. **Make it a test, not a review habit.** Two cheap guards, in the style of `src/lib/design-tokens.test.ts`:
   - a source scan that fails on `<Button` … `size="icon"` without `aria-label` within the same element;
   - one `@testing-library/react` render of the grid (already a devDependency) asserting `screen.getAllByRole("gridcell").length > 0` and that the active descendant resolves to a role-bearing node.

Optional but worth it: add `eslint-plugin-jsx-a11y` with `jsx-a11y/role-supports-aria-props` and `jsx-a11y/aria-role`; the project already runs a bespoke `eslint-plugin-react-hooks.d.ts` shim, so the toolchain has room for it.

## Acceptance criteria

- `getAllByRole("gridcell")` in the POS line grid and the extras grid returns one node per selectable cell; `aria-activedescendant` always resolves to a `role="gridcell"`.
- No `size="icon"` button in `src/` ships without an `aria-label`; the new source-scan test enforces it and fails against today's tree.
- The delete-row, dismiss, cancel-upload and print buttons are reachable and announced by name in NVDA (one manual pass on the POS screen and `/setting/data`).
- `bun test`, `bun run lint`, `bun run typecheck` green.

## Verification

- `bun test` (new guards) and `bun run lint`.
- Manual: NVDA (or Windows Narrator) on `/pos` — arrow through the cart and confirm the row name, qty and price are announced as you move; tab to the cart's X button and confirm it says "Hapus baris".
- Optional: axe DevTools on `/pos` and `/restock` (expect the `aria-required-children` / `aria-allowed-attr` violations today; zero after).
