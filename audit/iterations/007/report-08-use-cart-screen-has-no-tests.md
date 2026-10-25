---
slug: use-cart-screen-has-no-tests
title: "`useCartScreen` — the shared cart lifecycle both screens now depend on — still has no test at all"
severity: medium
category: testing
iteration: 7
created: 2026-10-21T20:44:05.194Z
files:
  - "src/components/cart/use-cart-screen.ts"
  - "src/components/cart/z-Listing.tsx"
  - "src/pages/Pos/page.tsx"
  - "src/pages/Restock/page.tsx"
  - "src/components/cart/z-Extras.test.tsx"
---

# `useCartScreen` — the shared cart lifecycle both screens now depend on — still has no test at all

- **Severity:** medium
- **Category:** testing
- **Files:** `src/components/cart/use-cart-screen.ts`, `src/components/cart/z-Listing.tsx`, `src/pages/Pos/page.tsx`, `src/pages/Restock/page.tsx`, `src/components/cart/z-Extras.test.tsx`
- **Iteration:** 7

## Summary

Partial recurrence of iteration 5/6's "the cart has no render tests": the three modules the de-duplication extracted — `useCartScreen` (343 lines: draft lifecycle, restore latch, `?draft=` repair, `Ctrl+Arrow` tab walker, `F12`) plus `z-Tabs`/`z-CartFrame` — are exactly the ones with no test, while the components that stayed in place (`useSubmitCart`, `z-Extras`, `z-Discount`) got them. Both of the last two iterations' real cart bugs were found by reading; this hook contains the same class of timer/guard logic, and the e2e suite is the only thing standing behind it.

## Details

## Evidence

`src/components/cart/use-cart-screen.ts` is 343 lines and is the single source of
truth for the whole cart lifecycle on both screens: which drafts exist, which is
open, the "there is always one open cart" effect (with its `creating` ref,
`restoring` latch and 1 s safety timeout), the `?draft=` repair, the
`Ctrl+Arrow` tab walker, `storeCart`/`openDraft` (park and restore), the
auto-title effect, and the `restore` latch the completion dialog drives.

It has **no test file**. `src/components/cart/` now contains:

```
use-submit-cart.test.ts     ← "Bayar" (added iteration 6)
z-Extras.test.tsx           ← the Tambahan grid's Enter handling (iter 6)
z-Discount.test.tsx         ← the discount dialog's inertness (iter 6)
code-issues.test.ts / extra-grid.test.ts / listing-grid.test.ts   ← pure geometry
```

so the three pieces that were extracted to *remove* duplication from the screens
— `useCartScreen`, `z-Listing`, `z-Tabs` / `z-CartFrame` — are precisely the
three with no tests, while the pieces that stayed put got them. The two screen
components themselves (`src/pages/Pos/page.tsx`, `src/pages/Restock/page.tsx`)
have no render test either; the only coverage of "a sale from an empty screen to
a completion dialog" is `e2e/pos-cart.e2e.ts`, which stops at cart totals.

That is not a theoretical gap. The last two iterations both produced real bugs in
this exact code and both were found by reading, not by a test:

* iteration 5 — the "Catat sebagai utang" dialog stayed open after a successful
  submit (inside `Restock/Draft/z-Kredit.tsx`, now covered);
* iteration 6 — Enter in the Tambahan search added the first preset instead of
  the highlighted one (`z-Extras.tsx`, now covered).

`useCartScreen` contains the same class of logic one layer up: a `setTimeout`
race (`:168-176`), a "creating" guard that must not create a second empty cart
while `complete !== null` (`:181-206`), an `activeId` repair effect that writes
the URL (`:216-222`), and the tab walker (`:219-247`).

The e2e suite cannot substitute: it needs a dev server plus Chromium, runs two
workers (the config's own comment says a bcrypt sign-in costs ~250 ms each), and
is the slowest, least specific signal available.

## Why it matters

This hook is the last un-refactored seam. Iteration 5's fix report says the
screen shell duplication was extracted here *because* "a keyboard or lifecycle
rule must not exist twice" — the refactor is right, and it made the highest-risk
logic in the app into a single module that nothing exercises. The next change to
it (a receipt auto-print after commit, a "this sale belongs to the previous
cashier" guard, offline retry) is exactly a change in `useSubmitCart` **plus**
this hook, and there is no cheap way to know the second empty cart still is not
created.

Also worth noting for scoring: `record/live.ts` (1,683 lines) and
`transaction/live.ts` (1,193) have thick behavioural coverage
(`credit/draft/import/mode/capital`, `submit`'s 57 cases, `flush`), so the
service layer is genuinely not the weak spot — the untested surface is
React-side lifecycle.

## Recommended fix

Test the hook, not the screens, using the harness that already exists (happy-dom
preloaded, RTL available, services stubbed at the boundary as
`z-Extras.test.tsx` does). Concretely, `renderHook(useCartScreen)` with a
`drafts` prop and `onDraft`/`onStage` spies:

1. no drafts → exactly one `transaction.add.new` call, and none while
   `complete !== null` / `submitting` / `restoring`;
2. a failed `add.new` sets `startError`, and `retryStart` re-runs it;
3. `?draft=` naming a closed draft calls `onDraft` with the first open draft and
   does not create another;
4. `storeCart` parks the active draft and calls `onDraft(undefined)` when it was
   the last one; `openDraft` on a parked draft calls `set.restore` first and
   `onDraft(id)` only on success;
5. `Ctrl+ArrowRight` moves to the next non-parked draft and does nothing when the
   target is a text input; `F12` starts a new one; `F2`/`F1` reach the injected
   callbacks;
6. switching `activeId` resets the stage to `firstStage` and bumps the focus
   token exactly once.

`z-Listing.tsx` deserves a second, smaller test: `pickFirst` must not add a
listing from a stale `results` when the debounced query has not caught up
(`:376-389` — it already handles it, but nothing pins it).

## Acceptance criteria

- `src/components/cart/use-cart-screen.test.ts` exists and covers the six cases
  above; it runs under plain `bun test` (no dev server, no SQLite).
- `bun test` gains those cases without new configuration or new test
  dependencies.
- `z-Listing.test.tsx` covers "Enter before the debounce fired does not add the
  previous query's first result".

## Verification

`bun test src/components/cart` (expect the new files in the summary), then
`bun test` for the whole suite (304 today) and `bun run test:e2e` unchanged.
