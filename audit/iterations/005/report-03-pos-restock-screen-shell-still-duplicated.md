---
slug: pos-restock-screen-shell-still-duplicated
title: "Pos and Restock screens are still the same shell written twice, and the copies have diverged"
severity: high
category: architecture
iteration: 5
created: 2026-10-21T19:52:50.536Z
files:
  - "src/pages/Pos/page.tsx"
  - "src/pages/Restock/page.tsx"
  - "src/pages/Pos/Draft/index.tsx"
  - "src/pages/Restock/Draft/index.tsx"
  - "src/pages/Pos/z-Bottom.tsx"
  - "src/pages/Restock/z-Bottom.tsx"
---

# Pos and Restock screens are still the same shell written twice, and the copies have diverged

- **Severity:** high
- **Category:** architecture
- **Files:** `src/pages/Pos/page.tsx`, `src/pages/Restock/page.tsx`, `src/pages/Pos/Draft/index.tsx`, `src/pages/Restock/Draft/index.tsx`, `src/pages/Pos/z-Bottom.tsx`, `src/pages/Restock/z-Bottom.tsx`
- **Iteration:** 5

## Summary

Recurring (5th iteration). The cart grid was merged, but the screen shell around it was not: `Pos/page.tsx` and `Restock/page.tsx` are the same ~120 lines of draft-creation guard, restore latch, `?draft=` repair, tab walking and completion wiring, written twice — and they have already diverged (parked tabs are restorable on Pos only, F2 means two different things, the `area` focus model exists on Pos only). This is where the next keyboard inconsistency will be introduced.

## Details

## Evidence

The shared *grid* was extracted in iteration 4 (`src/components/cart/*`), and that
work is real. The **screen shell** around it was not: `Pos/page.tsx` (414 lines)
and `Restock/page.tsx` (393) are still the same orchestration written twice, and
so are `Pos/Draft/index.tsx` (150) / `Restock/Draft/index.tsx` (187) and
`Pos/z-Bottom.tsx` (212) / `Restock/z-Bottom.tsx` (104).

`diff -u src/pages/Pos/page.tsx src/pages/Restock/page.tsx` shows the duplication
directly — the following blocks are copied with only the mode string and a
variable name changed:

- the `creating = useRef(false)` guard and the "the screen always has a cart to
  show" effect (Pos `page.tsx:151-176`, Restock `page.tsx:136-155`) — including the
  `startError` / `retry` recovery path, whose comment ("A rejected `add.new` writes
  no state, so the effect below would never re-run") is duplicated verbatim;
- the "restoring" latch and its 1000 ms safety net (Pos `:178-193`,
  Restock `:158-170`);
- the `?draft=` repair — `active = normalDrafts.find(...) ?? normalDrafts[0]`
  followed by the effect that rewrites the URL (Pos `:195-211`, Restock `:175-190`);
- `findLineIssues(...)` + `hasHardIssue` memo (Pos `:212-222`, Restock `:191-201`);
- the "tab switch resets the stage and bumps the search token" effect (Pos
  `:226-236`, Restock `:206-216`);
- the Ctrl/Cmd+Arrow tab walker with the "editors keep their own keys, except the
  search field" exemption (Pos `:238-263`, Restock `:218-241`);
- the `completeDialog` wiring and the `active === null` early-return comment
  ("Keep the dialog at the same child position … React remounts the dialog").

The copies have already diverged where they should not:

- Pos owns a two-panel focus model (`area`, `focused`/`onActivate`,
  `page.tsx:120-126`) that Restock does not have — so on Restock nothing prevents
  two grids claiming the selection at once;
- Pos has park/store (`storeCart`, `openDraft` re-expanding a parked tab,
  `page.tsx:305-340`) and **Restock has none**: `onSelect={onDraft}` is passed raw
  (`Restock/page.tsx:353`), so a parked purchase tab cannot be restored by click;
- Pos puts `F2` on the payment rows while Restock puts `F2` on the *stage*
  (`Restock/Draft/index.tsx:83-91`), and the `F12`/`F1` handlers take different
  branches (`Restock/page.tsx:106-131` vs `Pos/page.tsx:131-155`).

## Why it matters

This is the fifth audit to file it and it is no longer a size argument — the
divergence list above *is* the bug surface. Concretely: `STAGES` on Restock is
three entries, on Pos two, so `stage` from a shared URL (`?stage=payment`) has a
different meaning per screen; F2 does two different things on two screens that
look identical; parked purchase tabs are reachable but not restorable. Every new
keyboard rule has to be written twice and remembered twice, and the merge in
iteration 4 has already shown that the two copies drift within one commit.

It is also why none of this orchestration is tested: the same 120 lines of
effects exist twice, and there are no render tests (see the testing report), so
the only way to prove a change is to click through both screens.

## Recommended fix

Extract the shell once, in the shape the code already suggests:

```
src/components/cart/use-cart-screen.ts   // hook: drafts of a mode, creating guard,
                                         //   restoring latch, activeId repair,
                                         //   startError/retry, tab walking
src/components/cart/z-CartScreen.tsx     // renders <Tabs/> + <StageBody/> + <Bottom/> + <Complete/>
```

Parameters that are genuinely per-screen, and only these: `mode` (`incoming` /
`outcoming`), `stages`, the stage renderer, the bottom panel, and the submit
capability (`credit?: boolean`). Park/store and the `area` focus model should be
*in* the shared component (they are not product differences — one screen simply
never got them), and `Kredit` should be an optional slot.

Target: `Pos/page.tsx` and `Restock/page.tsx` become ~40-line route files.

## Acceptance criteria

- `Pos/page.tsx` and `Restock/page.tsx` contain no `useEffect`, no `useRef`
  creation guard, and no URL repair logic.
- F1/F2/F12 and Ctrl+Arrow behave identically on both screens except where the
  prop says otherwise, and that exception is a documented prop.
- Parked (`STORED_FLAG`) tabs can be restored by click on **both** screens.
- `wc -l src/pages/Pos/page.tsx src/pages/Restock/page.tsx` totals < 120.

## Verification

- `git diff --stat` after the refactor: `src/pages/{Pos,Restock}/page.tsx` shrink
  by > 600 lines combined, `src/components/cart/` grows.
- Manual matrix on both screens: F12 new tab, F1 focus, F2 settle, Ctrl+Arrow
  walk, park + restore, `Batalkan` from `Complete`, invalid `?draft=` and
  `?stage=` in the URL, plus the `startError` retry (simulate by failing
  `transaction.add.new`).
- The render test from the testing report should mount the shared component once
  and cover both modes by prop.
