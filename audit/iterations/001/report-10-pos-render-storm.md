---
slug: pos-render-storm
title: "Every cart keystroke re-renders and re-animates the entire POS card list"
severity: medium
category: react
iteration: 1
created: 2026-10-21T17:32:03.206Z
files:
  - "src/pages/Pos/page.tsx"
  - "src/pages/Pos/Draft/z-Listing.tsx"
  - "src/pages/Pos/Draft/z-ListingCard.tsx"
  - "src/pages/Pos/Draft/z-Cell.tsx"
  - "src/pages/Pos/Draft/z-Methods.tsx"
  - "src/services/transaction/live.ts"
  - "src/components/Loader.tsx"
  - "src/main.tsx"
---

# Every cart keystroke re-renders and re-animates the entire POS card list

- **Severity:** medium
- **Category:** react
- **Files:** `src/pages/Pos/page.tsx`, `src/pages/Pos/Draft/z-Listing.tsx`, `src/pages/Pos/Draft/z-ListingCard.tsx`, `src/pages/Pos/Draft/z-Cell.tsx`, `src/pages/Pos/Draft/z-Methods.tsx`, `src/services/transaction/live.ts`, `src/components/Loader.tsx`, `src/main.tsx`
- **Iteration:** 1

## Summary

`useStream(service.transaction.get.changes)` hands the POS a fresh `Draft[]` on every keystroke, and the card path has no memo boundaries (no `memo` on `ListingCard`/`Cell`, dnd-kit `useSortable` and `motion.div` per row), so typing a note re-renders and re-animates the whole cart. `useMutation` additionally has no unmount guard and a single shared `pending` flag.

## Details

## Evidence

The POS subscribes to the whole draft array once and passes the active draft's arrays down; nothing in the card path is memoised.

```tsx
// src/pages/Pos/page.tsx
const res = useStream(service.transaction.get.changes);          // whole Draft[]
…
const lines: Line[] = active.listings;                            // new array per emission
const setLines = (next) => void Effect.runFork(service.transaction.listings.set(active.id, next));
…
<Draft lines={lines} onLines={setLines} extras={extras} onExtras={setExtras} … />
```

`service.transaction.set.note(id, note)` (and every other `set.*`) does:

```ts
// src/services/transaction/live.ts:395
yield* SubscriptionRef.update(draftsRef, (drafts) => drafts.map(d => d.id === id ? change(d) : d));
```

so **typing one character in the note field** emits a brand-new `Draft[]`, a brand-new `active`, and a brand-new `listings` array. That invalidates every `useMemo`/prop in `Screen`, `Draft`, `StageBody`, `Listing` and every child:

- `src/pages/Pos/Draft/z-ListingCard.tsx` — `export function ListingCard(...)`, no `React.memo`; each card wraps `motion.div` with `initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} exit={…}` and runs `useSortable()` (dnd-kit) per card.
- `src/pages/Pos/Draft/z-Cell.tsx` — no `React.memo`, has its own `useEffect` and local `useState`.
- `src/pages/Pos/Draft/z-Listing.tsx` — `useEffect` chain keyed on `selection`, `editing`, `focused`, `focusSearch`, `focusLast`, `activeId`, `discountFor`; `rows`/`ids` recomputed from `lines` on every emission.

Same structure in `src/pages/Restock/page.tsx` + `Restock/Draft/*` and in `src/pages/Pos/Draft/z-Methods.tsx` (`latestDraft` ref + `set(draft.methods.map(...))` per keystroke, line ~230).

There is no `<StrictMode>` (`src/main.tsx`) so double-subscription is not a problem, but it also removes the check that would have caught the missing cleanup in `useMutation`:

```ts
// src/components/Loader.tsx, useMutation
const mutate = useCallback(async (input) => {
  setPending(true); setError(null);
  try { … } finally { setPending(false); }      // no unmount guard
}, []);
```

`pending` is also a single boolean for all callers: two concurrent `mutate`s make the first completion clear the spinner while the second is still running.

## Why it matters

- A cashier types a 40-character note on a 30-line cart: that is 40 emissions × (30 cards × dnd-kit `useSortable` + 60+ motion nodes + ~6 effects each). POS keys are latency-sensitive; this is where dropped keystrokes come from.
- The same emission is what schedules the debounced full-cart rewrite (see the cart report), so one keystroke = one full POS repaint + one 200-statement write 100 ms later.
- Non-memoised `motion.div` cards re-run entry animations on unrelated state changes, which is exactly the "layout thrash" a desktop POS must avoid.
- `useMutation`'s missing unmount guard is less severe (React 19 ignores the update) but shows the pattern is not consistently guarded.

## Recommended fix

1. **Narrow the subscription.** Split the note/title/fix fields out of the draft stream (`service.transaction.get.note(id): Stream<string>` or a separate `metaRef`) so a note keystroke does not emit the listings array.
2. **Stabilise identities.** In `SubscriptionRef.update`, keep the untouched drafts' identity (`d.id === id ? change(d) : d` already does this) — then make components consume per-draft slices (`useStream(get.lines(id))`) instead of deriving arrays in `page.tsx`.
3. **Memoise the card path:** `const ListingCard = memo(function ListingCard(...))` with stable callbacks (`useCallback` in `z-Listing` keyed on `line.id`), and drop the `motion.div` entry animation from rows that are not being added (animate only on mount via `layout`).
4. `setLines`/`setExtras` should be `useCallback`-stable per draft id, not recreated on every render.
5. Harden `useMutation`: track a mounted ref and per-call counters so `pending` is accurate under concurrency.

## Acceptance criteria

- Typing in the note field does not re-render `ListingCard` rows (verify with React DevTools Profiler "highlight updates" — only the note cell should flash).
- Adding one line animates exactly that line; editing an existing line does not animate any row.
- A 30-line cart with 40 keystrokes performs ≤ a few hundred React commits, not thousands; the search/arrow keys stay responsive on a low-end POS terminal.
- `pending` from `useMutation` is false only when all in-flight mutations have settled.

## Verification

- React DevTools Profiler: record typing "catatan" in the note field on a 30-line cart; the flame chart must show the note cell and not the `ListingCard` subtree.
- Add `console.count("ListingCard")` (temporarily, not committed) and count renders for one keystroke: expected 0 (memo hit), current ≈ number of lines.
- E2E: the existing Playwright harness can measure keystroke → total-text update latency via `performance.now()` around `page.type`.
