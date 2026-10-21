---
slug: sort-headers-missing-aria-sort
title: "Sort direction is icon-only: the Records list and Debt table announce no `aria-sort`"
severity: medium
category: accessibility
iteration: 9
created: 2026-10-21T21:32:25.045Z
files:
  - "src/pages/Record/z-Record/List.tsx"
  - "src/pages/Debt/z-DebtTable.tsx"
  - "src/pages/Record/z-Record/List.test.tsx"
---

# Sort direction is icon-only: the Records list and Debt table announce no `aria-sort`

- **Severity:** medium
- **Category:** accessibility
- **Files:** `src/pages/Record/z-Record/List.tsx`, `src/pages/Debt/z-DebtTable.tsx`, `src/pages/Record/z-Record/List.test.tsx`
- **Iteration:** 9

## Summary

The Records day list and the Debt table expose their sort column and direction only as a lucide arrow inside the button: no `aria-sort` on the `<th>`, no accessible-name difference between ascending and descending, and the icon is not hidden. A screen-reader operator can press the header, re-sort the list, and get identical narration for both directions — on the two tables whose sort state is persisted in the URL and therefore survives navigation.

## Details

## Evidence

Both list surfaces that can be sorted expose the sort direction **only as a lucide icon**, and neither marks the
column header:

`src/pages/Record/z-Record/List.tsx`:

```tsx
<TableHead className="w-[120px] font-normal small:w-[93px]">
  <SortBtn onClick={() => handleClickSort("time")} sort={order === "time" ? sort : undefined}>
    Waktu
  </SortBtn>
</TableHead>
…
function SortBtn({ children, sort, onClick, className }) {
  if (sort === undefined)
    return <button onClick={onClick} className={…}>{children}</button>;
  return (
    <button onClick={onClick} className="…">
      {children}
      {sort === "desc" ? <ArrowDownWideNarrow /> : <ArrowDownNarrowWide />}
    </button>
  );
}
```

`src/pages/Debt/z-DebtTable.tsx` repeats the same component shape (`SortBtn`, `:118-135`).

What a screen reader gets for the sorted column is exactly `"Total"` — the same as for the unsorted one. The
icon has no `aria-label`, no `title`, and `<th>` carries no `aria-sort`. So:

- Which column is sorted, and in which direction, is not announced at all.
- The two states are indistinguishable, so the control reads as a plain button that "does something".
- `src/pages/Debt/z-DebtTable.tsx:91-100` also renders the sort state as an icon-only `<span>` inside the
  button, so there is not even an accessible-name difference between asc and desc.

The project has already standardised on the opposite approach everywhere else it signals state to assistive
tech — `aria-selected` on the roving-tabindex rows (`List.tsx:118`), `role="tablist"`/`aria-selected` on the cart
strip (`components/cart/z-Tabs.tsx`), `aria-label` on the icon buttons, the `role="status"` count in
`Record/Search/z-Search.tsx` — so this is the remaining gap rather than a house style.

`src/pages/Record/z-Record/List.test.tsx` exists and exercises the roving tabindex; it does not cover sorting.

## Why it matters

`aria-sort` is the only mechanism a screen reader has for "this table is ordered by Total, descending" — it is
the table equivalent of `aria-selected` on a tab. Without it a keyboard/screen-reader operator can re-sort the
day list and get no confirmation that anything happened, cannot tell an ascending list from a descending one,
and cannot answer "what is sorted right now" after a route change (the sort lives in the URL for Debt, so it
survives navigation). The app otherwise takes keyboard operation seriously (roving tabindex, documented
shortcuts, the Alt legend), so a table that is keyboard-*operable* but not keyboard-*legible* is an
inconsistency, not a nicety.

## Recommended fix

1. Put the sort on the header cell, not the button:

```tsx
<TableHead aria-sort={order === "time" ? (sort === "asc" ? "ascending" : "descending") : "none"} …>
  <SortBtn … >Waktu</SortBtn>
</TableHead>
```

(`aria-sort` values are `"ascending" | "descending" | "none" | "other"`.)

2. Give the button an explicit name that carries the intent, and hide the decorative icon:

```tsx
<button
  onClick={onClick}
  aria-label={`Urutkan menurut ${children}, ${sort === "asc" ? "naik" : "turun"}`}
  className="…"
>
  <span>{children}</span>
  <ArrowDownWideNarrow aria-hidden="true" className="icon" />
</button>
```

For the unsorted state: `aria-label={`Urutkan menurut ${children}`}`.

3. Same change in `src/pages/Debt/z-DebtTable.tsx`.

## Acceptance criteria

- The sorted column's `<th>` has `aria-sort="ascending"` or `"descending"`; the others have `aria-sort="none"`.
- Each sort button's accessible name states the column and, when sorted, the direction (checked with
  `getByRole("button", { name: /urutkan menurut total/i })`).
- The arrows are `aria-hidden="true"` (or carry the same text through the label, not instead of it).
- A test in `src/pages/Record/z-Record/List.test.tsx` toggles the header twice and asserts the `aria-sort`
  attribute sequence `none → ascending → descending`, and a Debt equivalent asserts it follows the URL params.

## Verification

```
bun test src/pages/Record/z-Record/List.test.tsx
bunx tsc --noEmit && bunx eslint . --max-warnings 0
```

Manual: with a screen reader (NVDA) or the Chromium accessibility tree, focus the Total header and press Enter —
the announcement should include "descending"/"ascending".
