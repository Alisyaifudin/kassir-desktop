---
slug: receipt-drops-negative-rounding
title: "A receipt for a downward rounding omits the rounding line and the grand total"
severity: high
category: correctness
iteration: 2
created: 2026-10-21T18:13:16.198Z
files:
  - "src/lib/receipt/build-summary.ts"
  - "src/lib/receipt/create-receipt-data.ts"
  - "src/pages/Pos/Draft/z-Methods.tsx"
  - "src/services/transaction/live.ts"
  - "src/pages/Record/Item/z-Receipt/z-Summary.tsx"
---

# A receipt for a downward rounding omits the rounding line and the grand total

- **Severity:** high
- **Category:** correctness
- **Files:** `src/lib/receipt/build-summary.ts`, `src/lib/receipt/create-receipt-data.ts`, `src/pages/Pos/Draft/z-Methods.tsx`, `src/services/transaction/live.ts`, `src/pages/Record/Item/z-Receipt/z-Summary.tsx`
- **Iteration:** 2

## Summary

`build-summary.ts` only prints the "Pembulatan" and "Total Semua" lines when `record.rounding > 0`, so a sale rounded *down* (a reachable, tested path: the Pembulatan cell has `allowNegative`, `submit` has a "supports negative rounding" unit test) prints a receipt showing `Total Rp100.500` and `Pembayaran Rp100.000` with no line explaining the Rp500 and no grand total. The dead `record.rounding > 0 ? "" : "-"` inside that block shows the guard was meant to be `!== 0`. Nothing in `src/lib/receipt/` tests the summary builder, which is why it survived.

## Details

## Evidence

`src/lib/receipt/build-summary.ts:53-73`:

```ts
// Rounding adjustments
if (record.rounding > 0) {
  const roundingLabel = "Pembulatan";
  const sign = record.rounding > 0 ? "" : "-";           // dead branch: always ""
  const roundingText = `${sign}Rp${Math.abs(record.rounding).toLocaleString("id-ID")}`;
  textData.push({ ... text: [roundingLabel, roundingText] ... });

  // Grand total after rounding
  const grandTotalLabel = "Total Semua";
  const grandTotalText = `Rp${record.grandTotal.toLocaleString("id-ID")}`;
  textData.push({ ... text: [grandTotalLabel, grandTotalText] ... });
}
```

The whole block — the "Pembulatan" line **and** the "Total Semua" line — is
guarded by `record.rounding > 0`. A negative rounding prints neither, and the
`sign` computation inside the block (`rounding > 0 ? "" : "-"`) can never produce
`"-"`, which is the tell that the guard was meant to be `!== 0`.

Negative rounding is a first-class, reachable value:

- the payment grid exposes it deliberately —
  `src/pages/Pos/Draft/z-Methods.tsx:329-339`, the Pembulatan `Cell` has
  `allowNegative` and `singleClickEdit`;
- the service accepts and stores it —
  `src/services/transaction/live.ts` computes
  `grand = roundMoney(transactionGrandTotal(total, draft.rounding), draft.fix)`
  and `submit` has a passing unit test for it:
  `(pass) TransactionService.submit — extras and discounts > supports negative rounding`;
- the record keeps it — `record.rounding` is persisted and `record.grandTotal`
  is derived from it.

So a cashier rounds a Rp100.500 total down to Rp100.000 and the printed receipt
says:

```
Total            Rp100.500
Pembayaran       Rp100.000
```

with no "Pembulatan -Rp500" line and no "Total Semua". The paper disagrees with
the money that was taken, and the customer has no line item explaining the
difference.

There is no test on this path: `src/lib/receipt/` has exactly one test file
(`build-header.test.ts`) covering the header dates; `build-summary.ts`,
`build-footer.ts`, `extras-text-data.ts`, `product-text-data.ts`,
`create-receipt-data.ts` and `build-transaction-summary.ts` are untested.

## Why it matters

The receipt is the only artefact the customer leaves with. A receipt whose
totals do not add up to what was paid is the single most expensive kind of bug a
POS can ship: it invites a dispute no one can win, and it looks like theft when
the shopkeeper cannot explain the gap. The screen is correct — only the printed
document is wrong, so it goes unnoticed until a customer complains.

## Recommended fix

1. Change the guard to include negative values and make the sign honest:

```ts
if (record.rounding !== 0) {
  const label = "Pembulatan";
  const sign = record.rounding < 0 ? "-" : "";
  const text = `${sign}Rp${Math.abs(record.rounding).toLocaleString("id-ID")}`;
  // ... push the Pembulatan row
  // ... then always push Total Semua / grandTotal
}
```

2. Decide and write down the ordering rule for a negative rounding: show it
   *after* `Total` (as a discount) but still before `Pembayaran`, and keep
   `Total Semua` as the last money line — the same shape the positive case
   already prints. `extrasTextData` already prints negative amounts with a
   leading sign (`z-Detail/extras.test.ts`: "leads with the sign, so a discount
   reads -Rp5.000"), so reuse that convention.
3. Check the same guard in `build-transaction-summary.ts` and the on-screen
   receipt (`src/pages/Record/Item/z-Receipt/z-Summary.tsx`) so paper and screen
   agree.

## Acceptance criteria

- A unit test in `src/lib/receipt/build-summary.test.ts` asserts, for
  `rounding: -500, total: 100500, grandTotal: 100000`:
  a "Pembulatan" row reading `-Rp500`, a "Total Semua" row reading `Rp100.000`,
  and that both appear between "Total" and "Pembayaran".
- The mirror test for positive rounding (unchanged behaviour) and for
  `rounding: 0` (neither row, exactly one "Total") exist too.
- The rendered text of `createReceiptData(record, 32)` for a negative-rounding
  record contains the string `-Rp500`.
- The e2e/manual receipt preview and the printed PDF show identical money lines.

## Verification

```
bun test src/lib/receipt
bun run typecheck
```

Manual: POS → add a listing, set Pembulatan to `-500` (the cell accepts a
negative), pay, print. The paper must show Total, Pembulatan -Rp500, Total Semua,
Pembayaran, Kembalian, and the numbers must sum. Repeat with `+500` and `0`.
