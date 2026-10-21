---
slug: extras-search-enter-adds-first-result
title: "Enter in the cart's \"Tambahan\" search adds the first preset, not the highlighted one"
severity: high
category: correctness
iteration: 6
created: 2026-10-21T20:20:01.822Z
files:
  - "src/components/cart/z-Extras.tsx"
  - "src/components/cart/z-ExtraSearch.tsx"
  - "src/components/cart/z-Listing.tsx"
---

# Enter in the cart's "Tambahan" search adds the first preset, not the highlighted one

- **Severity:** high
- **Category:** correctness
- **Files:** `src/components/cart/z-Extras.tsx`, `src/components/cart/z-ExtraSearch.tsx`, `src/components/cart/z-Listing.tsx`
- **Iteration:** 6

## Summary

The extras grid's keydown handler does not ignore events its child already handled (`event.defaultPrevented`), unlike the listing grid. So Enter inside the preset list runs twice: `ExtraSearch` picks `presets[selected]`, then the grid's own handler appends `results[0]`, and because both calls close over the same `extras` prop the second write overwrites the first. A cashier who arrows down to "Ongkos Kirim" and presses Enter gets whatever charge happens to sort first — on a real sale, the wrong amount goes onto the record.

## Details

## Evidence

`src/components/cart/z-ExtraSearch.tsx` owns a list-local selection and handles Enter itself:

```tsx
// z-ExtraSearch.tsx:41-45
case "Enter":
  event.preventDefault();
  if (presets[selected] !== undefined) onPick(presets[selected]);
  return;
```

`ExtraSearch` is rendered *inside* the grid container that also has a keydown handler
(`z-Extras.tsx:371`):

```tsx
onKeyDown={handleKeyDown}
...
{hidden ? (
  <ExtraSearch presets={results} containerRef={resultsRef} onPick={addPreset} ... />
```

`preventDefault()` does not stop propagation, and the grid's handler only filters by
DOM ancestry and editing state — it never checks whether the child already handled the
key (`z-Extras.tsx:311-318`):

```tsx
function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
  if (!event.currentTarget.contains(event.target as Node)) return;   // 314 — the preset div IS inside
  if (editing) return;
  if ((event.ctrlKey || event.metaKey) && event.key.startsWith("Arrow")) return;
  switch (event.key) {
```

so the same Enter reaches `z-Extras.tsx:342-350`:

```tsx
case "Enter":
  if (isSearch) {
    if (hidden && results[0] !== undefined) {
      event.preventDefault();
      addPreset(results[0]);      // ignores the list's `selected`
    }
    return;
  }
```

Both calls go through `append`, which reads the `extras` **prop**, not the previous
call's result (`z-Extras.tsx:243-246`):

```tsx
function append(extra: Extra) {
  onChange([...extras, extra]);
  return extra;
```

Within one event dispatch `extras` is the same array for both calls, so the second
`onChange` (`[...extras, results[0]]`) is written last by
`transaction.extras.set(...)` and the first call's preset is lost. Net effect: pressing
Enter adds **`results[0]`**, whatever is highlighted.

The listing grid already solved exactly this, which is what makes it a regression on the
extras side rather than an unknown interaction: `z-Listing.tsx:477` has
`if (event.defaultPrevented) return;` and `SearchResults` handles Enter/Arrow keys the
same way `ExtraSearch` does (`z-SearchResults.tsx:125-139`). `z-Extras.tsx` is the only
cart grid missing the guard.

Reproduction (manual, Release or `bun run tauri:dev`):
1. Pos → `Tambahan` (or Restock → `Tambahan`), with at least two extras configured in
   Extra, e.g. "Ongkos Kirim" and "Diskon Grosir".
2. Type a query that matches both, press `ArrowDown` once (second row highlighted).
3. Press Enter. The *first* row is added, not the highlighted one.

Also affected: `ArrowRight` in the preset list — the child ignores it, the parent moves
the grid selection off the search cell (`z-Extras.tsx:336-339`), so the next `ArrowDown`
moves the grid rather than the list.

## Why it matters

A charge is money on a receipt. Adding the wrong charge silently is worse than adding
none: the total is wrong, the receipt prints the wrong line, and there is no error to
notice. This is the primary keyboard path of the screen the cashier uses for every sale,
and the extra is usually a rate (shipping, a grosir discount) rather than a round number
the operator can spot-check afterwards.

## Recommended fix

1. Add the missing guard at the top of `z-Extras.tsx`'s `handleKeyDown`, exactly as
   `z-Listing.tsx:477` does:
   ```tsx
   if (event.defaultPrevented) return;   // a child list (preset search, kind select) handled it
   ```
   Put it next to the existing `contains`/`editing` guards so both grids read the same.
2. Make `append` non-lossy regardless, so a future double-dispatch cannot drop a write:
   ```tsx
   function append(extra: Extra) {
     onChange([...extras, extra]);   // → derive from the service's latest, or guard with a ref
   }
   ```
   The minimal safe version is to have `addPreset` be the only Enter path and to keep the
   `selected` index in the parent (lift `selected` into `Extras`, or pass `onEnter` down),
   so there is one owner of "which preset is chosen".
3. Add a render test (`src/components/cart/z-Extras.test.tsx`) that types a query with two
   matches, presses ArrowDown + Enter, and asserts exactly one extra was written with the
   **second** preset's name/value. The harness already exists (`bunfig.toml` preloads
   happy-dom + RTL).

## Acceptance criteria

- Enter in the preset list adds the highlighted preset and only that preset, for every
  index, on both Pos and Restock.
- After Enter the search field is empty, focused, and the extras list shows one new row.
- `ArrowRight`/`ArrowDown` inside the preset list only move the list selection; the grid
  selection stays on the search cell.
- A test fails against the current code (picks index 0 with two matches) and passes after
  the fix.

## Verification

- `bun test src/components/cart` — the new `z-Extras` render test (arrow to the second
  match, Enter, assert one write with the second preset).
- Manual: Pos → Tambahan → type a query matching ≥2 presets → ArrowDown → Enter → confirm
  the added row is the highlighted one and the total matches it.
- `bun run lint && bun run typecheck`.
