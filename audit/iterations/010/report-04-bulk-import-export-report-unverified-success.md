---
slug: bulk-import-export-report-unverified-success
title: "Bulk import reports \"Berhasil mengunggah\" even when every row was skipped, and export reports nothing at all"
severity: medium
category: ux
iteration: 10
created: 2026-10-21T21:51:52.575Z
files:
  - "src/pages/Setting/Data/ProductUpload/z-Selected.tsx"
  - "src/pages/Setting/Data/RecordUpload/z-Selected.tsx"
  - "src/pages/Money/History/z-UploadDialog/z-Selected.tsx"
  - "src/lib/export.ts"
  - "src/pages/Setting/Data/use-product-download.ts"
  - "src/pages/Setting/Data/ProductDownload.tsx"
---

# Bulk import reports "Berhasil mengunggah" even when every row was skipped, and export reports nothing at all

- **Severity:** medium
- **Category:** ux
- **Files:** `src/pages/Setting/Data/ProductUpload/z-Selected.tsx`, `src/pages/Setting/Data/RecordUpload/z-Selected.tsx`, `src/pages/Money/History/z-UploadDialog/z-Selected.tsx`, `src/lib/export.ts`, `src/pages/Setting/Data/use-product-download.ts`, `src/pages/Setting/Data/ProductDownload.tsx`
- **Iteration:** 10

## Summary

All three bulk-import dialogs finish with an unconditional `toast.success("Berhasil mengunggah")`, including when every row was rejected or skipped as a duplicate — the same render then shows a panel listing 200 skipped rows. The file is cleared from the panel either way, so the operator cannot check. On the export side the Rust command's written path (or its cancel) is discarded, so a successful export and a cancelled one are both silent.

## Details

## Evidence

Three bulk-import surfaces report the same unconditional success, after the loop that decides what actually happened:

- `src/pages/Setting/Data/ProductUpload/z-Selected.tsx:71` — `toast.success("Berhasil mengunggah");` runs after the `for` loop that pushes every rejected product into `skipped`.
- `src/pages/Setting/Data/RecordUpload/z-Selected.tsx:68` — same, after the loop that pushes every rejected record into `skipped`.
- `src/pages/Money/History/z-UploadDialog/z-Selected.tsx:74` — same, after the loop that pushes duplicate timestamps into `timestamps`.

Every skip path is a normal outcome, not an exception:

```tsx
// ProductUpload/z-Selected.tsx, inside the loop
yield* service.product.add(product).pipe(
  Effect.catchTags({
    ProductDuplicateCode: ({ value }) => Effect.sync(() => setSkipped((items) => [...items, { …, reason: `kode ${value} sudah dipakai` }])),
    ProductError: ({ message }) => Effect.sync(() => setSkipped((items) => [...items, { …, reason: message }])),
  }),
);
setProgress(index + 1);
```

So a file of 200 products whose codes all already exist produces: progress `200/200`, a "Berhasil mengunggah" toast, and a collapsed skipped panel. The counts that would settle it (`data.products.length - skipped.length`) are already in scope and are never used. The same file then calls `onRemove()`, which deletes the chosen file from the panel, so the operator cannot go back and compare.

The mirror-image problem on the export side: `src/lib/export.ts:20-36` funnels the Rust command's `Option<String>` (the written path, or `None` when the user cancelled the save dialog) into `Effect<void, IOError>`, discarding it. `src/pages/Setting/Data/use-product-download.ts:60-63` and `use-record-download.ts` therefore cannot distinguish "wrote 412 products to …" from "the cashier pressed Esc", and neither screen shows anything at all on success (`ProductDownload.tsx:9-21`, `RecordDownload.tsx`). Cancelling and succeeding are both silent.

## Why it matters

These dialogs are the app's data-migration surface — the way a shop moves a catalogue or a ledger between machines, and the way a wrong import gets repaired. An unconditional "success" toast on top of a skipped-panel is actively misleading: it is the message a cashier reads at a glance, and it says the opposite of the panel beneath it. The follow-on costs are real — a duplicate-code import that "succeeded" leaves the operator believing the catalogue is complete, and a silently-cancelled export leaves them hunting for a file that was never written. Neither path has a test.

## Recommended criteria (fix)

Report the outcome that actually happened, in one sentence, from the numbers the loops already have.

- Replace the three `toast.success("Berhasil mengunggah")` calls with a counted result, chosen from `written` vs `skipped`:
  - `skipped === 0` → `toast.success(\`${written} produk diunggah.\`)`
  - `0 < written` → `toast.warning(\`${written} diunggah, ${skipped} dilewati.\`)` (or one info toast + the existing skipped panel, which already carries the reasons)
  - `written === 0` → `toast.error("Tidak ada data yang bisa diunggah.")` and keep the file in the panel instead of calling `onRemove()` so the operator can fix and retry.
- Do not call `onRemove()` when nothing was written; keep the skipped panel visible.
- Return the written path from `saveJson` (`Effect<Option<string>, IOError>` is enough) and show it: `toast.success(\`Disimpan ke ${path}\`)` or, on `None`, nothing (cancel is not an error) but do not report success.

## Acceptance criteria

- Uploading a file where every row is skipped produces no success toast, keeps the source file selected, and names the reason (the existing skipped panel).
- Uploading a partially accepted file names both counts.
- A fully accepted file names the count written.
- Exporting shows the destination path on success and stays silent on cancel; there is never a success message when nothing was written.
- The three import surfaces share one result-to-message helper rather than each hard-coding a string.

## Verification

1. New tests next to the existing suite: `src/pages/Setting/Data/ProductUpload/z-Selected.test.tsx` with a fake service that rejects every row — assert `toast.success` was not called and `onRemove` was not called; and one that rejects half — assert the message carries both counts.
2. Manual: import a products file twice; the second run must not say "Berhasil mengunggah".
3. Manual: export products, press Esc in the save dialog, confirm no success message; export again and confirm the path is shown and the file exists.
