---
slug: dialogs-ship-without-descriptions
title: "Twenty-one dialogs have no accessible description, and Radix's warning is already in the test output"
severity: medium
category: accessibility
iteration: 10
created: 2026-10-21T21:52:07.042Z
files:
  - "src/components/ui/dialog.tsx"
  - "src/pages/Record/Item/z-Detail/z-Debt/index.tsx"
  - "src/pages/Cashier/z-NewCashier.tsx"
  - "src/pages/Money/History/z-NewRecord.tsx"
  - "src/pages/Money/History/z-DeletePocket.tsx"
  - "src/components/Calendar.tsx"
  - "src/components/DateRange.tsx"
---

# Twenty-one dialogs have no accessible description, and Radix's warning is already in the test output

- **Severity:** medium
- **Category:** accessibility
- **Files:** `src/components/ui/dialog.tsx`, `src/pages/Record/Item/z-Detail/z-Debt/index.tsx`, `src/pages/Cashier/z-NewCashier.tsx`, `src/pages/Money/History/z-NewRecord.tsx`, `src/pages/Money/History/z-DeletePocket.tsx`, `src/components/Calendar.tsx`, `src/components/DateRange.tsx`
- **Iteration:** 10

## Summary

Twenty-one of the app's thirty-five dialogs render a title with no `DialogDescription` (and no `aria-describedby={undefined}`), so Radix logs "Missing Description" on every mount — a warning already visible in the unit-test output — and a screen reader gets a bare title for money dialogs like `Bayar Kredit`. Two dialogs also nest their whole form/body inside `DialogHeader`, which is why the omission is easy to miss when reading them.

## Details

## Evidence

`src/components/ui/dialog.tsx:35-68` — the shared `DialogContent` passes `{...props}` straight to Radix and never supplies a default `aria-describedby`. Radix's `DialogContent` therefore emits, for every dialog without a `DialogDescription`, the console error:

```
Warning: Missing `Description` or `aria-describedby={undefined}` for {DialogContent}.
```

That warning is already visible in the current test run (`src/components/cart/z-Discount.test.tsx`, first line of output), so the pattern is live in the tree today.

Of the 35 files that render a `DialogContent`, only 14 ever render a `DialogDescription`:

```
rg -c "DialogContent"      src --glob "*.tsx"   # 35 files
rg -c "DialogDescription"  src --glob "*.tsx"   # 14 files
```

Money-critical dialogs among the ones with a title only:

- `src/pages/Record/Item/z-Detail/z-Debt/index.tsx:32-35` — "Bayar Kredit", two number fields, a computed total and change, and no description of what is being settled or what happens on submit.
- `src/pages/Cashier/z-NewCashier.tsx:26-29`, `src/pages/Method/z-NewBtn.tsx`, `src/pages/Customer/z-NewCustomer.tsx`, `src/pages/Money/z-NewPocket.tsx`, `src/pages/Extra/Detail/z-DeleteBtn.tsx:22`, `src/pages/Social/z-DeleteBtn.tsx:50`, `src/pages/Product/Detail/Image/z-DeleteImg.tsx`, `src/pages/Record/z-Header/FilterDialog.tsx:76`, `src/components/Calendar.tsx` (all three views), `src/components/DateRange.tsx:80`.

A related structural slip in the same files: the dialog *body* is nested inside `DialogHeader` (a `<div>` wrapper meant for the title), rather than beside it — `src/pages/Money/History/z-NewRecord.tsx:32-82` puts the entire `<form>` inside `DialogHeader`, and `src/pages/Money/History/z-DeletePocket.tsx:26-44` puts the whole warning paragraph and both buttons there. It is not a correctness bug, but it is the reason a reader cannot tell "description missing" from "description was put somewhere else".

Note the contrast with the destructive dialogs, which are done right (`src/pages/Product/Detail/z-ConfirmDelete.tsx:2`, `src/pages/Cashier/z-DeleteBtn.tsx:4`): they use `DialogDescription`, so the convention exists and is simply not enforced.

## Why it matters

Radix's `aria-describedby` is how a screen reader announces what a dialog wants before the operator starts tabbing through it. On a cashier terminal this is the difference between hearing "Bayar Kredit, dialog" and hearing "Bayar Kredit — cara membayar utang pelanggan…". More practically, the missing-description console error fires on every dialog mount in a production webview, which buries the errors that matter (the app routes typed failures to `log.error`, and `Setting > Log` is the support surface) under noise the developers learn to ignore. Suppressing the warning is a one-line change per dialog, and leaving it unsuppressed is worse than either fixing it or declaring it.

## Recommended fix

1. Make the intent explicit in the primitive so a missing description is a deliberate choice, not an accident: in `src/components/ui/dialog.tsx`, either
   - require it — add an optional `description?: React.ReactNode` prop to `DialogContent` that renders `<DialogDescription>` (and pass `aria-describedby={undefined}` only when the caller opts out with `description={null}`), or
   - at minimum, document the rule in `DialogContent`'s comment and add `aria-describedby={undefined}` to the dialogs that genuinely need no description (a pure confirmation where the title says everything).
2. Add descriptions to the data-entry dialogs that currently have none, starting with `Bayar Kredit` (say what total is being settled and that the record leaves the debt list), `Tambah Kasir`, `Tambah Metode`, `Tambah Pelanggan`, `Tambah Kantong`, `Filter`, and both calendar pickers (`Pilih tanggal` / `Pilih rentang tanggal`).
3. Move the bodies out of `DialogHeader` in `Money/History/z-NewRecord.tsx` and `Money/History/z-DeletePocket.tsx` so the header holds only the title and description.
4. Guard it: a test that scans `src/**/*.tsx` for `DialogContent` blocks lacking both `DialogDescription` and `aria-describedby={undefined}` (the same shape as `src/lib/design-tokens.test.ts`, which already proves this scanning style works in this repo). Allow-list the intentional exceptions explicitly.

## Acceptance criteria

- `bun test` output contains no "Missing `Description` or `aria-describedby`" warning.
- Every dialog either renders a `DialogDescription` or states `aria-describedby={undefined}` with a comment saying why.
- A guard test fails when a new dialog is added without one of the two.
- `Bayar Kredit`, the two calendar pickers and the five "Tambah …" dialogs have descriptions that name the object being changed.
- No dialog nests its form or its action buttons inside `DialogHeader`.

## Verification

1. Run `bun test 2>&1 | rg "Missing .Description"` — must print nothing.
2. Manual with a screen reader (NVDA on Windows): open `Bayar Kredit` and confirm the description is announced after the title.
3. The new guard test: add a throwaway dialog without a description and confirm it fails.
