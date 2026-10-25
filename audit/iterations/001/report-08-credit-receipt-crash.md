---
slug: credit-receipt-crash
title: "Printing a credit sale's receipt throws an uncatchable defect (stuck print button)"
severity: high
category: correctness
iteration: 1
created: 2026-10-21T17:31:24.038Z
files:
  - "src/lib/receipt/build-header.ts"
  - "src/lib/receipt/index.ts"
  - "src/lib/date.ts"
  - "src/services/record/index.ts"
  - "src/pages/Record/Item/z-Receipt/use-print-receipt.ts"
  - "src/pages/Record/Item/z-Receipt/program-print-receipt.ts"
  - "src/pages/Setting/Printer/util-program-print.ts"
---

# Printing a credit sale's receipt throws an uncatchable defect (stuck print button)

- **Severity:** high
- **Category:** correctness
- **Files:** `src/lib/receipt/build-header.ts`, `src/lib/receipt/index.ts`, `src/lib/date.ts`, `src/services/record/index.ts`, `src/pages/Record/Item/z-Receipt/use-print-receipt.ts`, `src/pages/Record/Item/z-Receipt/program-print-receipt.ts`, `src/pages/Setting/Printer/util-program-print.ts`
- **Iteration:** 1

## Summary

`record.paidAt` is `number | null` (null for credit sales) but `buildHeaderSection` feeds it to `formatDate`/`formatTime`, which call `Temporal.Instant.fromEpochMilliseconds(null)`. The throw happens as unwrapped sync code inside `Effect.gen`, so it becomes a defect that every `catchAll` misses: printing an unpaid receipt fails with no message and leaves the print button stuck loading.

## Details

## Evidence

A record's `paidAt` is nullable — a credit sale has `paidAt === null` and a `creditAt` instead:

```ts
// src/services/record/index.ts:97
paidAt: number | null;
```

```ts
// src/services/transaction/live.ts:514
const paidAt = credit ? null : Date.now();
payload = { draftId, paidAt, creditAt: credit ? Date.now() : null, … };
```

The receipt builder passes it into a non-nullable date formatter, and the compiler already says so:

```ts
// src/lib/receipt/build-header.ts:31
const datetime = formatDate(record.paidAt, "short") + ", " + formatTime(record.paidAt, "short");
```

```
src/lib/receipt/build-header.ts(31,31): error TS2345: Argument of type 'number | null' is not assignable to parameter of type 'number'.
src/lib/receipt/build-header.ts(31,75): error TS2345: Argument of type 'number | null' is not assignable to parameter of type 'number'.
```

`formatDate` / `formatTime` (`src/lib/date.ts`) do `Temporal.Instant.fromEpochMilliseconds(epochMilli)`, which throws for `null`:

```ts
export function formatDate(epochMilli: number, type: "short" | "long" = "short"): string {
  const tz = Temporal.Now.timeZoneId();
  const date = Temporal.Instant.fromEpochMilliseconds(epochMilli).toZonedDateTimeISO(tz);
```

The call site is unguarded sync code inside an `Effect.gen`, and Effect converts a throw in the generator body into a **defect**, not a typed failure:

```ts
// src/lib/receipt/index.ts, inside generatePdfBytes
const textData = createReceiptData(data, paperSize.width);   // ← throws here for a credit record
```

so every `Effect.catchAll` on the path is bypassed:

```ts
// src/pages/Setting/Printer/util-program-print.ts
}).pipe(Effect.catchAll((error) => { …; return Effect.succeed(error.message); }));
// src/pages/Record/Item/z-Receipt/program-print-receipt.ts
.pipe(Effect.catchAll((error) => { log.error(error.message); return Effect.succeed(error.message); }));
```

The caller then rejects and skips its own cleanup:

```ts
// src/pages/Record/Item/z-Receipt/use-print-receipt.ts
async function print() {
  setLoading(true);
  const message = await Effect.runPromise(programPrintReceipt(record));  // ← rejects (defect)
  setLoading(false);                                                     // never runs
  setError(message);
}
```

## Why it matters

- **Printing a receipt for an unpaid (credit/utang) sale crashes the print action.** The operator gets no message at all; the button stays in its loading state and the receipt never comes out. In a shop that hands an unpaid receipt to a customer to sign, that is the exact flow that breaks.
- The failure is invisible to every existing error handler because it is a defect, not a typed error — the whole "never throw, match on `_tag`" architecture silently stops applying at the one place that touches the printer.
- It is also the clearest example that the red typecheck (separate report) is already costing real bugs.

## Recommended fix

1. Decide what a credit receipt prints: use `record.paidAt ?? record.creditAt ?? record.createdAt` (the export path already does exactly this: `src/pages/Setting/Data/use-record-download.ts:13` — `paidAt: record.paidAt ?? record.creditAt ?? record.createdAt`) and label it (`"Belum dibayar"` / `"Jatuh tempo"`) instead of pretending it was paid.
2. Make `formatDate`/`formatTime` total, or keep them strict and make the receipt builder respect the type (`number | null`) so the compiler enforces the choice above.
3. Wrap all synchronous receipt construction in a typed Effect so a future throw cannot escape the error channel:
   ```ts
   const textData = yield* Effect.try({
     try: () => createReceiptData(data, paperSize.width),
     catch: (e) => new PdfDocError(e, "Gagal menyiapkan struk"),
   });
   ```
   (same for `expandWrappedTextData` and the `pdfDoc` drawing loops).
4. Make `use-print-receipt.ts` use `try/finally` (or `Effect.runPromiseExit`) so `setLoading(false)` always runs.

## Acceptance criteria

- Printing a receipt for a credit sale produces a PDF (with a "belum dibayar"/credit date line), no crash, no stuck spinner.
- No synchronous throw can escape `generatePdfBytes`: a fuzz/unit test passes `paidAt: null`, `customer.name: ""`, and a 500-character product name and gets a typed `PdfDocError` rather than a rejection.
- `npx tsc --noEmit` no longer reports `build-header.ts(31,*)`.
- The print button always leaves its loading state, including on failure.

## Verification

- Unit test: `expect(await Effect.runPromiseExit(generatePdfBytes({record: {...paidAt: null}, …}, options))).toMatchObject({ _tag: "Failure" })` — or success, per the chosen behaviour — never an uncaught rejection.
- Manual: in `/pos`, create a credit transaction ("Kredit"), open it in `/records`, press Print → PDF is produced and the dialog shows either success or a plain message.
- `rg -n "formatDate\\(record.paidAt" src` shows the null-handling branch.
