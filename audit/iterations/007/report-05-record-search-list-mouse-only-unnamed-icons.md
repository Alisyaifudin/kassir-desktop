---
slug: record-search-list-mouse-only-unnamed-icons
title: "The record search results are mouse-only, and the icon-button guard can't see the project's own icon-button spelling"
severity: medium
category: accessibility
iteration: 7
created: 2026-10-21T20:43:06.917Z
files:
  - "src/pages/Record/Search/z-Search.tsx"
  - "src/components/ui/icon-buttons.test.ts"
  - "src/pages/Record/z-Record/List.tsx"
---

# The record search results are mouse-only, and the icon-button guard can't see the project's own icon-button spelling

- **Severity:** medium
- **Category:** accessibility
- **Files:** `src/pages/Record/Search/z-Search.tsx`, `src/components/ui/icon-buttons.test.ts`, `src/pages/Record/z-Record/List.tsx`
- **Iteration:** 7

## Summary

The comprehensive record search renders up to 100 rows whose only control is an unnamed icon button, with no roving tabindex and no keyboard activation — while the sibling day list (`Record/z-Record/List.tsx`) got exactly that treatment in iteration 6. The regression guard that exists for this (`icon-buttons.test.ts`) only matches `size="icon"`, so every icon button written with the project's own `className="icon"` ships unnamed and untested.

## Details

## Evidence

The comprehensive record search (`/records/search`) is the screen a shopkeeper
uses to find a past sale, and its result list is the only way to open a record
from it.

`src/pages/Record/Search/z-Search.tsx:147-166` — each result is a `<TableRow>`
whose only control is an icon button:

```tsx
{page.entries.map((entry, index) => (
  <TableRow key={entry.id} className={cn({ "bg-blue-50/50": index % 2 === 0 })}>
    …
    <TableCell>
      <Button onClick={onClick(entry.recordId)} variant="link" className="p-0 cursor-pointer">
        <SquareArrowOutUpRight className="icon" />
      </Button>
    </TableCell>
  </TableRow>
))}
```

- The row itself has no `tabIndex`, no `onKeyDown`, no `role` — it is not a
  control.
- The button has no `aria-label`/`title`, so a screen reader announces
  "button" (or "link") once per row, up to `PAGE = 100` times, with nothing to
  distinguish them.
- The magnifier on the search form (`z-Search.tsx:47-50`) is the same:
  `<Button className="icon" variant="ghost"><SearchIcon /></Button>`, unnamed.

The existing guard does not see any of this — `src/components/ui/icon-buttons.test.ts:38`
skips to the next button unless the source contains `size="icon"`:

```ts
if (!source.includes('size="icon"')) continue;
```

`className="icon"` (the project's own icon-size class) is not in the allow-list,
so an unnamed icon-only `Button` passes the scan as long as it is not
`size="icon"`.

The sibling list was fixed in iteration 6: `src/pages/Record/z-Record/List.tsx`
now gives every data row `tabIndex` (roving, one tab stop), `aria-selected`,
`onClick` **and** `onKeyDown` for Enter/Space/Home/End, with tests in
`List.test.tsx`. The two lists are the same job — pick a record out of a table —
and only one of them is operable from the keyboard.

## Why it matters

A keyboard-only operator (the POS is designed to be keyboard-first: F1/F2/F12,
Ctrl+Arrow, Alt+0..5, arrow-driven grids) can reach `/records/search`, type a
query — and then has no way to open a result without a mouse. The one focusable
thing per row is a 100-row series of unnamed buttons.

It is also invisible to the project's own regression guard, which is the deeper
problem: `icon-buttons.test.ts` and `design-tokens.test.ts` encode conventions as
source scans, and both are narrower than the convention they defend. The next
icon button written with `className="icon"` will ship unnamed exactly as these
did.

## Recommended fix

1. **Make the row the control**, the same shape `Record/z-Record/List.tsx` uses:
   roving `tabIndex` (selected row, else first row → 0), `aria-selected`,
   `onClick` on the row, `onKeyDown` for `Enter`/`Space` (open) plus
   `ArrowUp`/`ArrowDown`/`Home`/`End`. Keep the trailing icon as a decorative
   affordance (`aria-hidden`, `tabIndex={-1}`) rather than a control, so the list
   is one tab stop instead of a hundred.
2. `aria-label` the magnifier (`"Cari transaksi"`) or drop it and let the input's
   label carry the meaning.
3. Widen `src/components/ui/icon-buttons.test.ts`: treat
   `className` containing the word `icon` (and a `Button` whose only child is an
   element from `lucide-react`) as icon-only, so the guard covers the spelling
   the codebase actually uses.

## Acceptance criteria

- From `/records/search` with a query typed, Tab reaches the result list once,
  Arrow keys move between rows, and Enter opens the record.
- Every row announces its record (date + name) as the accessible name, and no
  unnamed control exists in the list.
- `icon-buttons.test.ts` fails when a `<Button className="icon">` containing only
  an icon is added without `aria-label`.
- New `src/pages/Record/Search/z-Search.test.tsx` asserts the roving tabindex and
  Enter-opens, mirroring `List.test.tsx`.

## Verification

`bun test src/components/ui/icon-buttons.test.ts src/pages/Record` — the widened
guard may surface further offenders (fix them in the same pass). Then a
keyboard-only pass on `#/records/search?query=kopi`: Tab, arrows, Enter.
