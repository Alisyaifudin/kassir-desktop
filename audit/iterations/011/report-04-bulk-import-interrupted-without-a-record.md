---
slug: bulk-import-interrupted-without-a-record
title: "Bulk imports are owned by the panel's effect: navigating away silently leaves a half-imported file, and the money panel discards the file on a hard error"
severity: medium
category: ux
iteration: 11
created: 2026-10-21T22:17:12.919Z
files:
  - "src/pages/Setting/Data/ProductUpload/z-Selected.tsx"
  - "src/pages/Setting/Data/RecordUpload/z-Selected.tsx"
  - "src/pages/Money/History/z-UploadDialog/z-Selected.tsx"
  - "src/lib/upload.ts"
---

# Bulk imports are owned by the panel's effect: navigating away silently leaves a half-imported file, and the money panel discards the file on a hard error

- **Severity:** medium
- **Category:** ux
- **Files:** `src/pages/Setting/Data/ProductUpload/z-Selected.tsx`, `src/pages/Setting/Data/RecordUpload/z-Selected.tsx`, `src/pages/Money/History/z-UploadDialog/z-Selected.tsx`, `src/lib/upload.ts`
- **Iteration:** 11

## Summary

The three bulk-import panels run their file loop inside a component effect and interrupt the fiber on unmount, so leaving the screen halfway through a file leaves a partially imported catalogue/ledger with no toast, no skipped list, no log line and no selection left to retry — while the money panel additionally deletes the file on a hard error even though rows before it were written, contradicting the rule `src/lib/upload.ts` documents.

## Details

## Evidence

All three bulk-import panels run the whole file in an Effect fiber created by a component `useEffect`, and interrupt it in the effect's cleanup:

```tsx
// src/pages/Setting/Data/ProductUpload/z-Selected.tsx:89-95  (same shape in
// RecordUpload/z-Selected.tsx:84-90 and Money/History/z-UploadDialog/z-Selected.tsx:94-101)
const fiber = Effect.runFork(uploadEffect);
fiberRef.current = fiber;
return () => {
  interruptUpload();      // Effect.runFork(Fiber.interrupt(fiber))
};
```

Everything that would tell the operator what happened lives *after* the loop, in the same fiber:

```tsx
// ProductUpload/z-Selected.tsx:81-87
setSkipped(skippedRows);
notifyUpload(describeUpload({ written: ..., skipped: ..., noun: "produk" }));
if (skippedRows.length < data.products.length) onRemove();
```

So leaving the panel mid-file — clicking a nav item, pressing Alt+1..5, closing the route — interrupts the fiber between two rows and produces:

- no summary toast (`describeUpload` never runs),
- no skipped-reason panel (that list is component state and unmounts with the panel),
- no log line (nothing on this path calls `src/lib/log.ts`),
- a selection that is also gone, because the chosen file lives in the parent's state which unmounts too.

The operator's only evidence is a catalogue/ledger that is partly new. For products this self-heals on re-import (duplicate codes are skipped as "kode … sudah dipakai") and for money entries (duplicate timestamps are skipped), but only if they think to re-import the same file — nothing in the UI says they were interrupted.

The money panel adds two related inconsistencies:

```tsx
// src/pages/Money/History/z-UploadDialog/z-Selected.tsx:88-95
// Nothing written keeps the file in the panel, next to the reasons.
if (duplicates.length < data.money.length) onRemove();
}).pipe(
  Effect.catchTag("MoneyError", ({ message }) => {
    log.error(message);
    setError(message);
    onRemove();          // ← hard error: file is thrown away anyway
    return Effect.void;
  }),
);
```

A hard `MoneyError` at row 40 of 100 removes the file from the panel and clears it from the parent, so the operator cannot see which file failed, cannot retry it, and gets a one-line message instead of the partial count — the exact "unverified success/failure" class that `src/lib/upload.ts` was introduced to end. `RecordUpload` has no equivalent outer `catchTag` at all, so an unexpected defect from `add.external` escapes the fiber with no message and no log.

Finally, `RecordUpload` maps *every* `RecordError` to "skipped" (`z-Selected.tsx:59-71`), which after report 01's root cause includes errors raised after a record has already been committed — so a written row can be counted as skipped.

## Why it matters

A bulk import is the one operation in this app that changes hundreds of money-bearing rows at once, and it is the operation an operator runs while the shop is closed and then wants to be *done*. Today the panel is both the progress display and the durable record of what happened, so navigating away destroys the only accounting of a partial import. The store can end up half-imported with no message, no log entry, and no list of which rows landed.

## Recommended fix

1. Move the loop out of the component's lifetime: give the import its own owner (a service method or a module-level runner) that survives navigation and reports through a durable channel — the app log plus a service-held result the panel re-reads on mount (`service.logs`/a small `ImportService` with a `SubscriptionRef` of the last outcome).
2. At minimum: on cleanup, do not interrupt silently — log `"Impor dihentikan di baris N dari M"` through `src/lib/log.ts` and leave the outcome in the log the Setting → Log page reads, so the interruption is discoverable.
3. Make the money panel obey its own stated rule: on `MoneyError`, keep the file in the panel (like the zero-written path) and report the count reached so far, or report it as `describeUpload({written: progress, skipped: 0})` before removing.
4. Add the missing outer `catchAllCause` to `RecordUpload`/`ProductUpload` so a defect is logged and shown, not swallowed.
5. Do not classify a post-commit `RecordError` as "skipped" (see report 01) — distinguish "rejected before writing" from "written but the cache is stale".

## Acceptance criteria

- Navigating away mid-import leaves one log line naming the file, the row count reached and the total.
- Re-opening the import panel after an interruption still shows the previous outcome (or the log does, with the counts).
- A `MoneyError` mid-file keeps the panel's file entry and reports `written`/`total`; nothing is removed before a message names what happened.
- No import path can exit without either a toast or a log line.

## Verification

- Manual: pick a 200-row product file, navigate to `/pos` after ~2 seconds, then check Setting → Log for the interruption line.
- Inject a `MoneyError` on the 3rd of 10 rows; assert the panel still lists the file and the message states how many were written.
- `bun test`, `npx tsc --noEmit`, `npx eslint . --max-warnings 0`.
