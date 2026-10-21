---
slug: list-surfaces-missing-roving-tabindex
title: "Four of six list surfaces never adopted the roving-tabindex model, so Tab crawls them row by row through unnamed icon links"
severity: medium
category: accessibility
iteration: 11
created: 2026-10-21T22:16:39.123Z
files:
  - "src/pages/Debt/z-DebtTable.tsx"
  - "src/pages/Product/z-ProductTable.tsx"
  - "src/pages/Extra/z-ExtraList.tsx"
  - "src/pages/Money/History/z-TableList.tsx"
  - "src/pages/Record/z-Record/List.tsx"
  - "src/pages/Record/Search/z-Search.tsx"
  - "src/components/ui/icon-buttons.test.ts"
---

# Four of six list surfaces never adopted the roving-tabindex model, so Tab crawls them row by row through unnamed icon links

- **Severity:** medium
- **Category:** accessibility
- **Files:** `src/pages/Debt/z-DebtTable.tsx`, `src/pages/Product/z-ProductTable.tsx`, `src/pages/Extra/z-ExtraList.tsx`, `src/pages/Money/History/z-TableList.tsx`, `src/pages/Record/z-Record/List.tsx`, `src/pages/Record/Search/z-Search.tsx`, `src/components/ui/icon-buttons.test.ts`
- **Iteration:** 11

## Summary

The project's roving-tabindex model ("the list is one tab stop, arrows move inside it") is implemented in only two of the six list surfaces. The Debt, Product, Extra and Money-history tables make every row its own tab stop whose only content is an icon link — and in the Extra list that link has no accessible name at all, because the `icon-buttons` guard only inspects `<Button>`s that contain the icon directly, not the `asChild`-wrapped `<Link>` shapes these tables use.

## Details

## Evidence

The project adopted a roving-tabindex model for lists ("the list is one tab stop, arrows move inside it") and applies it in exactly two places:

- `src/pages/Record/z-Record/List.tsx:39-80` — `tabStop` + `handleRowKeyDown` for Arrow/Home/End/Enter/Space.
- `src/pages/Record/Search/z-Search.tsx:118-130` — same model, plus a test (`z-Search.test.tsx`).

`grep -rln "tabIndex" src/pages src/components` returns only the cart grids, `Record/Search`, `Record/z-Record/List`, `Password` and `combobox`. The other list surfaces have none:

| Surface | File | Per-row focusable today |
|---|---|---|
| Debt (money-critical) | `src/pages/Debt/z-DebtTable.tsx:62-87` | one icon link |
| Product catalogue | `src/pages/Product/z-ProductTable.tsx:71-85` | one icon link |
| Extra catalogue | `src/pages/Extra/z-ExtraList.tsx:17-40` | one icon link, **unnamed** |
| Money history | `src/pages/Money/History/z-TableList.tsx` | row action buttons |

Concretely, the Debt table renders

```tsx
// src/pages/Debt/z-DebtTable.tsx:70-85
<TableRow key={record.id}>
  ...
  <Button asChild size="icon" variant="link">
    <Link to={{ pathname: `/records/${record.id}`, search: ... }}>
      <ExternalLink className="size-8 small:size-6" aria-label="Buka catatan" />
    </Link>
  </Button>
</TableRow>
```

with no `tabIndex`/`onKeyDown` on the row, so a shop with 300 outstanding debts is 300 tab stops to get past the table, and each stop is an icon whose name is carried by `aria-label` *on the `<svg>`* rather than on the link.

The Extra list is worse — the same shape with no label anywhere:

```tsx
// src/pages/Extra/z-ExtraList.tsx:28-38
<Button asChild variant="link" className="p-0 cursor-pointer">
  <Link to={{ pathname: `/extras/${extra.id}`, search: ... }}>
    <SquareArrowOutUpRight className="icon" />
  </Link>
</Button>
```

`src/components/ui/icon-buttons.test.ts` cannot catch this: `isIconOnly()` only inspects a `<Button>` whose own opening tag contains `size="icon"` or the bare `icon` utility, and the button here is `variant="link" className="p-0 …"` with the icon one level down inside the `asChild` child. The Product table avoids the naming bug by putting `aria-label={\`Buka ${product.name}\`}` on the `<Link>` (`z-ProductTable.tsx:76`) — proof the fix is already known, just not applied everywhere.

## Why it matters

The keyboard-only path through this app is a documented, tested, deliberate design (F1/F2/F12, Alt+digit, grid hand-off, roving lists). Three of the six remaining list screens break it in the same way: Tab no longer walks a list, it crawls it, one anonymous icon at a time. On the Debt screen that is the *only* way to reach a customer's credit — the list where a wrong click costs money — and a screen-reader user hears "link, link, link" with no record attached. Keyboard operation is not decoration here; the POS is designed so the cashier never needs the mouse.

## Recommended fix

1. Extract the model that already exists twice into one hook, e.g. `src/hooks/use-roving-rows.ts`: given the row ids (or just `count`), return `tabStop`, `onRowKeyDown(index)`, and the `tr` props. `List.tsx` and `z-Search.tsx` become its first two callers, and `DebtTable`, `ProductTable`, `ExtraList` and `Money/History/z-TableList` get the same behaviour by adding one line per row.
2. Give each row an accessible name independent of the icon: `aria-label` on the `<Link>` (as `ProductTable` already does) or, better, make the whole row the activation target so the name comes from the row's text (record note / extra name / product name).
3. Extend `icon-buttons.test.ts` (or add a sibling guard) to flag any `<Link>`/`<a>` whose only child is an icon and that has no `aria-label`/`aria-labelledby`/`sr-only` text — that is what let `ExtraList` ship.

## Acceptance criteria

- The Debt, Product, Extra and Money-history tables each declare exactly one tab stop; arrow keys move the row cursor inside the list; Enter/Space opens the focused row.
- No `<Link>`/`<a>` in `src/` has icon-only content without an accessible name; a source-scan test enforces it.
- `z-DebtTable.test.tsx` (or a new test) asserts: one tab stop, ArrowDown moves it, Enter navigates.

## Verification

- `bun test src/components/ui/icon-buttons.test.ts src/pages/Debt` (new guard + new keyboard test).
- Manual: Tab into `/debt` with 3+ rows — the caret enters the table once, arrows walk rows, Enter opens the record; screen reader announces the record's note, not "link".
- `npx tsc --noEmit`, `npx eslint . --max-warnings 0`.
