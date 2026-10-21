---
slug: records-list-every-row-tab-stop
title: "The Records list makes every row a tab stop, so Tab no longer walks a list — it crawls it"
severity: medium
category: accessibility
iteration: 6
created: 2026-10-21T20:20:31.576Z
files:
  - "src/pages/Record/z-Record/List.tsx"
  - "src/pages/Record/use-records.ts"
---

# The Records list makes every row a tab stop, so Tab no longer walks a list — it crawls it

- **Severity:** medium
- **Category:** accessibility
- **Files:** `src/pages/Record/z-Record/List.tsx`, `src/pages/Record/use-records.ts`
- **Iteration:** 6

## Summary

Every record row carries `tabIndex={0}`, so a normal shift of 50–200 records is 50–200 Tab presses between the header and the detail pane; the comment in the file claims the opposite ("Tab reaches a row, Up/Down walk the list"). Roving tabindex — one stop for the list, arrows inside — is the model the POS grids already use.

## Details

## Evidence

Every row of the Records list is a tab stop, and nothing else is:

```tsx
// src/pages/Record/z-Record/List.tsx:88-99
<TableRow
  // The list is the only way to open a record's detail pane, so it
  // has to work without a mouse: Tab reaches a row, Up/Down walk the
  // list, Enter (or Space) opens the one under the cursor.
  tabIndex={0}
  aria-selected={selected === record.id}
  onKeyDown={handleRowKeyDown(i)}
  onClick={() => setSelected(record.id)}
```

The comment states the intent — "Tab reaches a row, Up/Down walk the list" — and the
Up/Down half is implemented by walking `tbody` children by hand
(`List.tsx:42-49`):

```tsx
const rows = event.currentTarget
  .closest("tbody")
  ?.querySelectorAll<HTMLTableRowElement>("tr:not([aria-hidden='true'])");
```

but `tabIndex={0}` on *every* row means Tab does not reach "a row": it reaches row 1, then
row 2, … then row N, before it can leave the list. The list is a full day of records
(`useRecords` is `record.get.byRange(day.start, day.end, query)`), so a normal shift is
50–200 tab presses to get from the header's search box to the detail pane on the right.
No row is `-1`, and the selected row is not the only tab stop.

Note also that the `tr:not([aria-hidden='true'])` filter has no matching producer — no row
in this list is ever `aria-hidden="true"` — so the selector is a leftover from a
virtualized variant that no longer exists; it silently does nothing if a row is ever
added for spacing.

## Why it matters

The Records screen is where the owner audits the day's sales; it is explicitly built to
work without a mouse (the rows are focusable, Enter/Space select, Up/Down walk). As
written, the keyboard model is *worse* than plain links: a keyboard-only operator has no
practical way past a long list, and a screen-reader user hears the row count as that many
separate stops with no "row 3 of 87" context (there is no `aria-rowindex`/`aria-rowcount`,
and the `<Table>` has no `aria-label` naming the list).

The same shape will bite the next list that adds keyboard rows; this is the pattern the
POS grids already get right (a single focusable container plus
`aria-activedescendant`, `z-Listing.tsx:528-534`).

## Recommended fix

Use a roving tabindex, as the POS grids do:

1. `tabIndex={selected === record.id ? 0 : -1}` on the row — exactly one row is in the tab
   order. When nothing is selected, make the first row the 0 (or the `<TableBody>` the
   single stop and let Up/Down enter the rows).
2. Move focus with the rows: in `handleRowKeyDown`, after `setSelected(record.id)` also
   `event.currentTarget.focus()` so Home/End and Up/Down keep focus moving; add
   `Home`/`End` (first/last row).
3. Set the tab stop when the selection changes from elsewhere (a `?selected=` deep link):
   `useEffect` → focus the selected row, or accept that Tab lands on the selected row and
   Enter opens it.
4. Give the table a name and row context: `aria-label="Daftar transaksi hari ini"` on the
   `Table`, and `aria-rowcount`/`aria-rowindex` if you keep a header row in the count.
5. Drop the dead `tr:not([aria-hidden='true'])` selector, or keep it only if a virtualizer
   is actually added.

## Acceptance criteria

- Tab from the search box reaches the list exactly once, then the detail pane; the number
  of Tab presses does not depend on how many records the day has.
- Up/Down/Home/End move focus and Enter/Space select, with the selected row being the
  single tab stop.
- The list has an accessible name; the selection is exposed via `aria-selected`.
- A render test with ≥10 rows asserts only one row has `tabIndex === 0` and that ArrowDown
  moves focus to the next row (extend `src/pages/Record/z-Record/List.test.tsx`, which
  already renders this component).

## Verification

- `bun test src/pages/Record/z-Record/List.test.tsx` with the added tab-order assertions.
- Manual keyboard pass on a day with 50+ records: F6/F1 into the search box, Tab once →
  lands on the selected (or first) row, Up/Down walk, Tab again → the detail pane.
- `bun run lint && bun run typecheck`.
