---
slug: discount-exceeds-line-and-negative-total-commits
title: "A line discount can exceed the line, and the commit path only rejects a total of exactly zero — a negative sale is saved"
severity: high
category: correctness
iteration: 8
created: 2026-10-21T21:07:54.302Z
files:
  - "src/lib/purchase.ts"
  - "src/components/cart/z-Discount.tsx"
  - "src/components/cart/z-Extra.tsx"
  - "src/services/transaction/live.ts"
  - "src/services/record/live.ts"
  - "src/pages/Pos/page.tsx"
  - "src/pages/Pos/z-Bottom.tsx"
---

# A line discount can exceed the line, and the commit path only rejects a total of exactly zero — a negative sale is saved

- **Severity:** high
- **Category:** correctness
- **Files:** `src/lib/purchase.ts`, `src/components/cart/z-Discount.tsx`, `src/components/cart/z-Extra.tsx`, `src/services/transaction/live.ts`, `src/services/record/live.ts`, `src/pages/Pos/page.tsx`, `src/pages/Pos/z-Bottom.tsx`
- **Iteration:** 8

## Summary

Nothing bounds a cart line's discount by the line's own total: `recalcDiscounts` subtracts any `eff` from `price × qty`, the "Angka" editor is an uncapped `InputCurrency` and the "PCS" editor is an uncapped integer count (so `pcs: 2` on a one-piece line is instantly twice the line total). The resulting negative line rolls up into a negative grand total, and `transaction.submit` guards only `grand.isZero()` — so with any non-zero tender the record commits with `record_total` negative, `record_pay` positive, a positive "Kembalian", and a receipt that says the shop owed the customer money. On a POS where a mistyped discount is the expected mistake, this silently writes history.

## Details

## Evidence

**The discount is unbounded at the source.** `src/lib/purchase.ts:58` `recalcDiscounts` subtracts whatever comes out of the value, with no reference to the running total or to the line total:

```ts
case "number":
  eff = new Decimal(line.value);              // any rupiah amount
  break;
case "pcs":
  eff = new Decimal(line.value).times(price); // any piece count
  break;
case "percent":
  eff = new Decimal(line.value).div(100).times(running); // bounded by UI only
  break;
running = running.minus(eff);                 // may go negative
```

Only the *percent* editor is clamped (`InputPercent` with `min={0} max={100}` held in `src/components/ui/input-percent.tsx`). The other two are open:

- `src/components/cart/z-Discount.tsx:293` — `InputCurrency` for the "Angka" kind, no `max`, no comparison with `lineSubtotal(line)` (which the same dialog already computes and prints at the top of the dialog: `rupiah(lineSubtotal(line))`).
- `src/components/cart/z-Discount.tsx:315` — plain `<Input inputMode="numeric">` for the "PCS" kind, `Number(value.replace(/\D/g, ""))`, no clamp to `line.qty`.

A "PCS" discount of `2` on a line of `qty: 1` therefore yields `eff = 2 × price`, i.e. `price × qty − eff = −price`. Discounts also stack, so two large "Angka" rows on a small line reach negative without any single typo being extreme.

**The screen accepts the negative total.** `src/pages/Pos/page.tsx:100` computes the readiness rule as

```ts
ready: () => !grand.isZero() && !change.isNegative(),
```

With `grand < 0` and `paid = 0`, `change = paid − grand` is *positive*, so the rule passes. `src/pages/Pos/z-Bottom.tsx` (`submit()`) only checks `disabled || change.isNegative()`, and `disabled` is `hardIssue || submitting || grand.isZero()` — a negative total is not "disabled". Bayar stays enabled and prints "Kembalian Rp95.000" next to a negative total.

**The service guards zero, not a floor.** `src/services/transaction/live.ts:764-772`:

```ts
const grand = roundMoney(transactionGrandTotal(total, rounding), draft.fix);
if (grand.isZero()) { /* "Total transaksi tidak boleh nol" */ }
const pay = credit ? new Decimal(0) : roundMoney(paidTotal(draft.methods), draft.fix);
if (!credit && pay.lessThan(grand)) { /* "Pembayaran belum mencukupi" */ }
```

`0 < −95000` is false, so underpayment passes. The per-line loop above it rejects `line.price < 0` but never looks at `line.discounts[].eff`. The only thing that stops the write is the *unrelated* `methods.length === 0` check ("Metode pembayaran harus diisi"), which fires only when the cashier typed no tender at all — so the failure the cashier sees is the wrong message, and with any tender the write goes through.

**The record layer trusts it.** `src/services/record/live.ts:1176` recomputes the line total from the same stale figures and stores it:

```ts
const lineTotal = new Decimal(line.price)
  .times(line.qty)
  .minus(line.discounts.reduce((total, discount) => total.plus(discount.eff), new Decimal(0)));
```

and `record_total` is `input.total` verbatim (`live.ts:999`, `insertRecordStatement` at `live.ts:1152`). So the negative figure is persisted, appears in the Records list, in the detail view, on the printed receipt (`src/lib/receipt/*`), in the day's totals, and in the JSON export that Settings → Data produces.

There is no test for this: `src/services/transaction/submit.test.ts` covers "rejects a zero-total sale" and "supports a pcs discount", but no case where a discount exceeds the line.

## Why it matters

This is the one money path in the app with no invariant. Every other boundary the audits hardened — `payCredit`, credit settlement, import validation, stock lots — refuses to write when the numbers do not make sense; here a mistyped discount writes a record with a negative total and a positive change. Consequences:

- **Wrong books.** `records.record_total` is what the day totals, the analytics and the export read (`src/services/record/live.ts:220` sums `ROUND(record_total + record_rounding, record_fix)`). One negative sale silently reduces the day's takings.
- **A receipt that says the shop paid the customer.** `buildSummarySection`/`createReceiptData` print the stored lines, so the paper agrees with the bad row.
- **Wrong stock reasoning.** The stock still moves (the line has `qty > 0`), so goods left the shelf against money that came in the other direction.
- **A confusing failure when it *is* caught.** With no tender, the cashier gets "Metode pembayaran harus diisi" instead of "Diskon melebihi harga barang", so the real mistake is never named.

## Recommended fix

Enforce the invariant at the two layers that already own it, and make the UI say so:

1. **`src/lib/purchase.ts`** — bound the discount by what is left of the line. Keep the derivation pure and shared:

   ```ts
   // clamp per row: a row may not take more than the running total
   const usable = Decimal.min(eff, running);      // or `running.isNegative() ? 0 : eff`
   running = running.minus(usable);
   ```

   and export a `lineIssue(line)` (or `discountsExceed(line): boolean`) the grids can render, so the cart shows the problem inline the way `code-issues.ts` already does for codes.

2. **`src/services/transaction/live.ts`** — reject a non-positive grand total, not just zero, *and* reject a line whose discount total reaches its subtotal, before the payment checks:

   ```ts
   if (grand.isNegative() || grand.isZero()) → SubmitError({ kind: "payment", message: "Total transaksi tidak boleh nol atau negatif" })
   for (const line of lines) if (lineDiscountTotal(line).gte(lineSubtotal(line))) → SubmitError({ kind: "price", message: `Diskon ${line.name} melebihi harga barang` })
   ```

3. **`src/services/record/live.ts`** — the same floor in `add.draft`'s line loop, next to the existing `price < 0` check, so an import or a future caller cannot route around `transaction.submit`. `validateRecordLine` (`src/services/record/validate-line.ts`) is the shared place if the rule is expressed per line.

4. **UI** — pass `max` to the two discount editors (`lineSubtotal(line)` for "Angka", `line.qty` for "PCS"), so the *typing* is bounded too and the mistake is visible before Bayar.

## Acceptance criteria

- A line whose discount total equals or exceeds `price × qty` cannot be committed; the failure names the line and the reason, and it is reported before the payment checks so the message is about the discount, not the tender.
- `calculate` anywhere in the cart: a negative page/total never renders as a payable cart — either the discount is clamped as it is typed, or Bayar is disabled with an inline issue on the line.
- `record.add.draft` and `record.add.external` refuse a negative or zero record total, so no path (cart, import, direct call) can persist one.
- New unit tests: `recalcDiscounts` with `kind: "number"`/`"pcs"` exceeding the line, stacked discounts, and `submit` rejecting a discount that eats the line.

## Verification

- `bun test` with the new cases in `src/lib/purchase.test.ts` and `src/services/transaction/submit.test.ts` ("a pcs discount larger than the quantity is refused", "an over-discount leaves the total negative and is refused", "a discount that exactly equals the line is refused").
- Manual: Pos → add one line (Rp5.000, qty 1) → Diskon → kind `PCS` → type `2` → Esc → the cart must show an issue / a disabled Bayar and never "Kembalian Rp5.000" against a negative total. Repeat with `Angka` = 999999.
- `sqlite3` check after the manual run: `SELECT record_total FROM records ORDER BY record_created_at DESC LIMIT 1;` must never be negative on a fresh database with only that flow attempted.
