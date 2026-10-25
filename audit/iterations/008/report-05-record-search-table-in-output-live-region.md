---
slug: record-search-table-in-output-live-region
title: "The record search result table is wrapped in `<output>`, making the whole 100-row table an atomic live region announced on every keystroke"
severity: medium
category: accessibility
iteration: 8
created: 2026-10-21T21:09:04.862Z
files:
  - "src/pages/Record/Search/z-Search.tsx"
---

# The record search result table is wrapped in `<output>`, making the whole 100-row table an atomic live region announced on every keystroke

- **Severity:** medium
- **Category:** accessibility
- **Files:** `src/pages/Record/Search/z-Search.tsx`
- **Iteration:** 8

## Summary

`src/pages/Record/Search/z-Search.tsx` wraps the entire result table — and its loading skeleton — in an `<output>` element used as a layout div. `<output>` maps to ARIA `role="status"`, an atomic polite live region, so every keystroke that re-queries `/records/search` (and every "Lebih banyak" append) makes a screen reader read up to 100 rows × 7 cells of date/time/name/qty/price aloud, while the one thing worth announcing ("Menampilkan 100 / 4320") is just a row inside the same region. The fix is a `<div>` plus one small `role="status"` count.

## Details

## Evidence

The whole record search result table — and its loading skeleton — is wrapped in the `<output>` element, used here as a layout box:

```tsx
// src/pages/Record/Search/z-Search.tsx:66-75
<Loader res={res} fallback={<LoadingTable />}>
  {({ data }) => (
    <output className="flex-1 overflow-hidden">
      <div className="max-h-full overflow-hidden flex">
        <SearchTable page={data} onMore={onMore} />
      </div>
    </output>
  )}
</Loader>

// :219-223 — the skeleton, same wrapper
function LoadingTable() {
  return (
    <output className="flex-1 overflow-hidden">
      <div className="max-h-full overflow-hidden flex">
```

Per the HTML-AAM, `<output>` maps to ARIA **`role="status"`**, which is an `aria-live="polite"` region with `aria-atomic="true"`. So every time `data` changes — which is **every keystroke that changes the `query` param**, and every "Lebih banyak" page append — the browser announces the *entire* subtree as one atomic update, up to `PAGE = 100` rows (`src/pages/Record/Search/z-Search.tsx:27`), each with seven cells of date, time, name, qty and price.

Nothing in this component advertises a status role or an announcement on purpose: the string it is meant to convey ("Menampilkan 100 / 4320 | Lebih banyak", `z-Search.tsx:162`) is a row inside the same table, so the accidental live region is the only thing announced and it announces the wrong thing at maximum length.

## Why it matters

- **It is the worst possible content for a live region.** A screen-reader user searching ("kopi") gets a polite, atomic reading of a 100-row table after every character typed, with no way to interrupt it other than Escape or silence; the actual state (how many results, whether more exist) is buried inside the announcement.
- **It hijacks navigation.** Because the region covers the table, arrow-keying through rows in the roving-tabindex model (`z-Search.tsx:189-215`, `tabIndex={index === tabStop ? 0 : -1}`) re-announces the region as rows are appended.
- **The skeleton screams first.** `LoadingTable` is the `fallback`, so the first paint of a search announces twelve skeleton rows before any data exists — an empty-looking, meaningless burst.
- **It is semantically wrong even without a screen reader.** `<output>` is for the result of a calculation; using it as a flex wrapper also means the `<Table>`'s own semantics sit under a `status` role, which some AT configurations flatten.

## Recommended fix

1. **Use a plain container for the layout** — `<div className="flex-1 overflow-hidden">` in both places (`z-Search.tsx:73` and `:221`). That alone removes the accidental live region.
2. **Announce the thing that actually changed**, once, in a small visually-hidden status node near the form:

   ```tsx
   <p role="status" className="sr-only">
     {page.total === 0 ? "Tidak ada yang cocok" : `${page.entries.length} dari ${page.total} hasil`}
   </p>
   ```

   Rendered from `SearchTable`, so it updates on query changes and on "Lebih banyak" without reading the table.
3. While there: the "Lebih banyak" control at `z-Search.tsx:162-166` is a bare `<button className="underline">` inside a `<td>`; it is the one control in the list that is *not* part of the roving-tabindex model (it is only reachable after Tab-ing out of the list). Either give it `aria-label="Muat hasil berikutnya"` and keep it as the list's last tab stop, or move paging to the table footer outside the roving grid.

## Acceptance criteria

- No `role="status"` / live region wraps the result rows or the skeleton.
- One `role="status"` node announces a short result count when the query result changes, and is empty when nothing changed.
- Typing a multi-character query is announced as a count, not as table contents (verify with a screen reader or by inspecting the live-region DOM: the text content of the live node must be one short sentence).
- The load-more control has an accessible name and is reachable from the list's keyboard model.

## Verification

- Inspect the DOM after typing in `/records/search`: `document.querySelectorAll('[role="status"],[aria-live]')` must contain exactly one node, and its `textContent` must be a short sentence.
- VoiceOver/NVDA (or `@testing-library`'s a11y tree via a render test in `src/pages/Record/Search/z-Search.test.tsx`): render two pages of results, assert no element with `role="status"` contains a `table` descendant.
