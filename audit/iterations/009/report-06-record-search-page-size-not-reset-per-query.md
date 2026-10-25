---
slug: record-search-page-size-not-reset-per-query
title: "Record search keeps the expanded page size (and the old focus index) after the query changes"
severity: low
category: performance
iteration: 9
created: 2026-10-21T21:32:57.192Z
files:
  - "src/pages/Record/Search/z-Search.tsx"
  - "src/pages/Record/Search/use-data.ts"
  - "src/services/record/live.ts"
---

# Record search keeps the expanded page size (and the old focus index) after the query changes

- **Severity:** low
- **Category:** performance
- **Files:** `src/pages/Record/Search/z-Search.tsx`, `src/pages/Record/Search/use-data.ts`, `src/services/record/live.ts`
- **Iteration:** 9

## Summary

The record-search page keeps `limit` in state that is never reset when the query changes, so one "Lebih banyak" permanently raises the page size for the rest of the session — every later keypress re-queries and renders 200, then 300 rows, defeating the deliberate cap that made the screen fast. The roving focus index has the same problem: it survives a new query, so the list's single tab stop lands mid-list instead of on the first result.

## Details

## Evidence

`src/pages/Record/Search/z-Search.tsx` keeps the "how many rows to ask for" in component state that is never
reset when the query changes:

```tsx
const PAGE = 100;
…
const [query, setQuery] = useQuery();
const [limit, setLimit] = useState(PAGE);          // :30 — never reset
…
function handleSubmit(event) {
  event.preventDefault();
  const formdata = new FormData(event.currentTarget);
  setQuery((formdata.get("query") as string | null) ?? "");   // query changes, limit stays
}
…
<Results limit={limit} onMore={() => setLimit((current) => current + PAGE)} />
```

`Results` → `useData(limit)` → `service.record.get.listingHistory({ start, end, mode, query, limit })` with
`[start, endExclusive, mode, query, limit, revision]` as the `useQuery` deps
(`src/pages/Record/Search/use-data.ts`), and `keepPrevious: true`. So after one "Lebih banyak":

- every subsequent keystroke re-runs the search with `limit = 200`, then `300`, …;
- every result set renders that many `<TableRow>`s (the page has no virtualization; `@tanstack/react-virtual` is
  a dependency but is not used here);
- the user never gets back to the 100-row default for the rest of the session, even though the new query has
  nothing to do with the one that was expanded.

The same block has a second per-query state that is not reset: `SearchTable`'s roving cursor

```tsx
const [focused, setFocused] = useState(0);         // :118
const tabStop = Math.min(focused, Math.max(0, page.entries.length - 1));
```

`focused` survives a new query, so after typing over a previous search the list's single tab stop is wherever
the old cursor was (e.g. row 8), not at the top — the operator presses Tab, lands mid-list, and cannot tell which
row has focus because the row under it changed.

## Why it matters

`useData`'s own doc comment explains the design intent: "a single letter over a month matches thousands of
lines, and pulling them all across the IPC to render a hundred is the difference between instant and not". That
reasoning applies to every keypress, and the paging state defeats it after the first "Lebih banyak". The search
box re-queries on submit for each new term, over `COUNT(*) OVER ()` plus a `LIKE` join
(`src/services/record/live.ts:275-290`), and the IPC payload and the DOM both grow with `limit` — on the POS
terminal this is the screen that stops feeling native first.

## Recommended fix

Scope the paging to the query it was expanded for:

```tsx
// A new search starts from one page: the previous query's "Lebih banyak" is not
// an instruction about this one.
useEffect(() => {
  setLimit(PAGE);
}, [query, mode, start, endExclusive]);
```

(The same effect is the natural place to reset the cursor: pass an `onQueryChange`/`key={query}` down to
`Results` so `SearchTable` remounts with `focused = 0` — cheapest is `<SearchTable key={query} … />`, which is
also correct for the row ids it holds.)

If you want the larger fix later, this is the list that should use `@tanstack/react-virtual` (already a
dependency) for the rows beyond the first page, so the DOM cost stops scaling with `limit` even when it is 300.

## Acceptance criteria

- After "Lebih banyak" and then a new search term, exactly one page (`PAGE`) is requested (assert the `limit`
  passed to `service.record.get.listingHistory`).
- The first Tab into the results after a new query lands on the first row, and `aria-label` of that row matches
  the first result.
- `revision` bumps (a commit elsewhere) still re-read the current page without resetting it.

## Verification

```
bun test src/pages/Record/Search/z-Search.test.tsx   # new assertions on the requested limit
bunx tsc --noEmit && bunx eslint . --max-warnings 0
```

Manual: `/records/search` → search "a" → press "Lebih banyak" twice → replace the term with "b" → the count
sentence shows `Menampilkan 100 dari N`, and the requested `limit` in the service call is 100 again.
