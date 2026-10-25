---
slug: records-url-state-pushes-history-entries
title: "Records screen pushes a history entry per keystroke-pause, sort click and row click, so Back rewinds the filters"
severity: medium
category: react
iteration: 5
created: 2026-10-21T19:52:36.327Z
files:
  - "src/pages/Record/use-query.ts"
  - "src/pages/Record/use-selected.ts"
  - "src/pages/Record/use-order.ts"
  - "src/pages/Record/use-mode.ts"
  - "src/pages/Record/use-time.ts"
  - "src/pages/Record/z-Header/SearchBars.tsx"
  - "src/pages/Record/z-Record/List.tsx"
  - "src/pages/Record/use-method.ts"
---

# Records screen pushes a history entry per keystroke-pause, sort click and row click, so Back rewinds the filters

- **Severity:** medium
- **Category:** react
- **Files:** `src/pages/Record/use-query.ts`, `src/pages/Record/use-selected.ts`, `src/pages/Record/use-order.ts`, `src/pages/Record/use-mode.ts`, `src/pages/Record/use-time.ts`, `src/pages/Record/z-Header/SearchBars.tsx`, `src/pages/Record/z-Record/List.tsx`, `src/pages/Record/use-method.ts`
- **Iteration:** 5

## Summary

Five of the six URL-state hooks on the Records screen (`?query=`, `?selected=`, `?order=`, `?mode=`, `?time=`) call `setSearch` without `{ replace: true }`, while `use-method.ts` in the same folder does — and the cart hooks were fixed for exactly this in iteration 3. A 100 ms-debounced search box therefore pushes a history entry per typing pause, and Back/Alt+Left rewinds the query, the sort and the selected row instead of leaving the screen.

## Details

## Evidence

The cart side of this app learned the rule (`src/pages/cart/use-draft.ts:26-38`
and `use-stage.ts:24-33` both pass `{ replace: true }`, with a comment explaining
that a tab switch must not push a history entry). The Records screen never did:
it stores five pieces of transient UI state in the URL and every one of them
pushes a new entry.

| file | state | writes history? |
|---|---|---|
| `src/pages/Record/use-query.ts:15-24` | `?query=` | **yes** — `setSearch(...)` with no options |
| `src/pages/Record/use-selected.ts:6-18` | `?selected=` | **yes** |
| `src/pages/Record/use-order.ts:27-34` | `?order=`, `?sort=` | **yes** |
| `src/pages/Record/use-mode.ts:15-22` | `?mode=` | **yes** |
| `src/pages/Record/use-time.ts:49-59` | `?time=` | **yes** |
| `src/pages/Record/use-method.ts:44-57` | `?kinds=`, `?methods=` | **no** — `{ replace: true }`, comment: "Ticking boxes shouldn't fill the history stack." |

The search box writes through a 100 ms debounce
(`src/pages/Record/z-Header/SearchBars.tsx:16-19` with `DEBOUNCE_DELAY` from
`src/lib/constants.ts:89`), so typing "susu" at a normal pace and pausing between
letters produces up to four `?query=` history entries. Every sort-header click
(`src/pages/Record/z-Record/List.tsx:49,58`) and every row click
(`List.tsx:75`) adds another. `useSelected` toggles the param off when the same
row is clicked again, so clicking two rows twice is four entries.

The same screen has no way back to the previous *place*: the only way out of
`/records` is the topbar, because Back/Alt+Left first replays
`?selected=` → `?order=` → `?query=sus` → `?query=su` → … before it leaves the
route.

## Why it matters

Back is a first-class key on a Windows desktop: Alt+Left, a mouse's back button,
and the back gesture on a trackpad all map to it. Rewinding the filter stack
instead of leaving the screen silently changes what the cashier is looking at
(a different day, a different query) while the header still looks like the same
page. The history stack also grows without bound during a shift — a `?query=`
entry per debounce pause is a leak in the session history, and it is the exact
root cause the fourth audit filed for the cart (`cart-url-state-pushes-history-entries`),
fixed there and left standing here.

## Recommended fix

1. Treat all of the above as derived view state, not navigation: pass
   `{ replace: true }` in `use-query.ts`, `use-selected.ts`, `use-order.ts`,
   `use-mode.ts` and `use-time.ts`, matching `use-method.ts` (the day stepper and
   the calendar are the same screen's controls; a deliberate "open this day"
   navigation does not exist here).
2. If some of it *should* be navigable (a workflow might want "back to the day I
   was on"), keep **one** entry per deliberate jump — the calendar pick — and
   replace for the rest.
3. Note the decision in `use-selected.ts` so the next reader does not "restore"
   push semantics.

## Acceptance criteria

- Typing a query, changing sort, switching mode, stepping the day, and clicking
  rows add **zero** entries to `history.length` (checked with a `history.length`
  assertion in an e2e step on `/records`).
- Exactly one Back press from `/records` leaves the route, whatever the operator
  did to the filters first.
- The method filter's existing behaviour is unchanged.

## Verification

- Playwright: `page.evaluate(() => history.length)` before/after typing into
  `#record-no`, clicking a sort header, and clicking two rows — the number must
  be unchanged; then `page.goBack()` must land off `/records`.
- `rg -n "setSearch\(" src/pages/Record` — every call site carries
  `{ replace: true }` or a comment saying why it does not.
