---
slug: kredit-dialog-survives-successful-submit
title: "The Restock \"Catat sebagai utang\" dialog stays open after a successful credit submit"
severity: medium
category: correctness
iteration: 5
created: 2026-10-21T19:52:23.508Z
files:
  - "src/pages/Restock/Draft/z-Kredit.tsx"
  - "src/pages/Restock/Draft/z-Payment.tsx"
  - "src/pages/Restock/page.tsx"
  - "src/pages/Restock/z-Complete.tsx"
---

# The Restock "Catat sebagai utang" dialog stays open after a successful credit submit

- **Severity:** medium
- **Category:** correctness
- **Files:** `src/pages/Restock/Draft/z-Kredit.tsx`, `src/pages/Restock/Draft/z-Payment.tsx`, `src/pages/Restock/page.tsx`, `src/pages/Restock/z-Complete.tsx`
- **Iteration:** 5

## Summary

`Kredit`'s `confirm()` closes nothing on the success path: it awaits `onCredit()`, and when that resolves `null` it only sets `busy` back to false. Meanwhile the page's `runSubmit(true)` sets `complete`, which mounts a *second* modal (`Complete`). After the operator dismisses `Complete` ("Batalkan", "Lihat detail", "Cetak", X), the Kredit confirmation is still open on top of the next purchase — bound to whatever draft is now active — so the purchase screen is covered by a stale "Catat sebagai utang?" prompt whose button can submit the *wrong* cart.

## Details

## Evidence

`src/pages/Restock/Draft/z-Kredit.tsx` — the success path never closes the dialog:

```tsx
const [open, setOpen] = useState(false);
...
async function confirm() {
  setBusy(true);
  setError(null);
  const failure = await onCredit();   // resolves null on success
  setBusy(false);
  if (failure !== null) setError(failure);   // ← no setOpen(false) anywhere
}
```

The only writes to `open` are the trigger, the `onOpenChange` handler (guarded by
`if (busy) return;`) and the "Batal" button (line 65).

`onCredit` is `() => runSubmit(true)` from `src/pages/Restock/page.tsx:368`, and
`runSubmit` does exactly one thing on success (`page.tsx:328`):

```tsx
setComplete({ recordId: result.right, total: credit ? creditGrand : grand, change, fix: active.fix, credit });
```

so for a successful credit the outcome is **two simultaneously open Radix
dialogs**: the Kredit confirmation (mounted at `src/pages/Restock/Draft/z-Payment.tsx:130`,
`<Kredit onCredit={onCredit} disabled={creditDisabled} />`) and the
`<Complete>` rendered from the page. `Complete` is rendered after the cart in the
page's JSX, so its portal is on top; the Kredit dialog is merely hidden.

`Kredit` is also **not keyed by draft id**, and the stage does not reset on
submit (`stage` is the page's URL state and stays `"payment"`), so the same
`Kredit` instance keeps its `open` state while `active` swaps to the next (or a
freshly created empty) draft. Dismissing `Complete` therefore uncovers a
confirmation dialog that belongs to a purchase that no longer exists — its
"Kredit" button now calls `runSubmit(true)` for a *different* draft.

The worse path is `Complete` → "Batalkan" (`z-Complete.tsx:75-89`): the record is
unsubmitted and its cart restored, `onClose()` runs, and the operator is left with
a still-open "Catat sebagai utang?" over the restored cart. One click records the
purchase they just tried to cancel as credit.

No test covers this: there are no component render tests at all (see the testing
report), and the e2e suite covers only Pos search/cart (`e2e/pos-cart.e2e.ts`).

## Why it matters

`Kredit` is a destructive-ish commit — it writes the whole purchase as debt with
no payment — and it is reported as fixed ("show credit failures in the dialog",
commit `be5e8d72`). The success path was the untested half. A stale modal that
outlives its cart is exactly the class of bug that makes a cashier distrust the
screen: the prompt looks current, its data is not, and its confirm button acts on
a draft the operator cannot see behind the overlay.

## Recommended fix

1. Close on success inside `Kredit` (`confirm()` → `setOpen(false)` after the
   success branch), or better, make the dialog own its whole lifecycle:
   `onCredit` resolves `null` → `setOpen(false)`.
2. Belt and braces: `key={draft.id}` on `<Kredit … />` in `z-Payment.tsx` (or on
   `Payment`/`StageBody`) so nothing dialog-shaped survives a draft switch, and
   the same for `Images`/`Supplier` if they hold transient state.
3. Add one assertion that the two dialogs are never open together — the cleanest
   place is a render test that mounts `Payment` with a fake `onCredit` resolving
   `null` and asserts the dialog's `getByRole("dialog")` count drops to zero.

## Acceptance criteria

- After a successful credit submit, exactly one dialog is in the DOM: `Complete`.
- After dismissing `Complete` by any of its four exits, the purchase screen shows
  no open dialog and no stale confirmation state.
- Switching purchase tabs while any draft-scoped dialog is open leaves no dialog
  (or leaves one bound to the newly active draft).
- A test fails if `Kredit` resolves success without closing.

## Verification

- Manual: Restock → add a line → F2 → `Kredit` → confirm → dismiss `Complete`
  (each of X / Cetak / Lihat detail / Batalkan). Expect: no dialog, no
  "Catat sebagai utang?" prompt, and the staging area usable.
- Manual: open `Kredit`, cancel `Complete` with `Batalkan`, then confirm the
  restored cart is *not* submitted.
- Instrumented check in a render test: count `[role=dialog]` after the resolved
  promise (`await waitFor(...)`).
