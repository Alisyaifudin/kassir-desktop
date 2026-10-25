---
slug: paycredit-has-no-amount-or-state-guard
title: "`record.set.payCredit` settles a debt with no amount and no state check — the only money write in `record` with no server-side guard"
severity: medium
category: correctness
iteration: 7
created: 2026-10-21T20:42:11.296Z
files:
  - "src/services/record/live.ts"
  - "src/pages/Record/Item/z-Detail/z-Debt/use-debt.ts"
  - "src/pages/Record/Item/z-Detail/z-Debt/index.tsx"
  - "src/services/record/index.ts"
---

# `record.set.payCredit` settles a debt with no amount and no state check — the only money write in `record` with no server-side guard

- **Severity:** medium
- **Category:** correctness
- **Files:** `src/services/record/live.ts`, `src/pages/Record/Item/z-Detail/z-Debt/use-debt.ts`, `src/pages/Record/Item/z-Detail/z-Debt/index.tsx`, `src/services/record/index.ts`
- **Iteration:** 7

## Summary

`payCredit` writes `record_pay`, `record_rounding` and `record_paid_at` from caller input, checking only that the numbers are finite and that `pay >= 0`. Settling is what removes a record from the debt list (`WHERE record_credit_at IS NOT NULL AND record_paid_at IS NULL`), so an underpayment clears the debt with the shop short, and a call on a cash sale silently rewrites that sale's payment and re-stamps its paid date. Every other write path in `record/live.ts` validates its boundary (`price < 0`, `unit`, `qty`, `NaN`, blank name); this one is enforced only by the dialog's own `required.gt(pay)` check.

## Details

## Evidence

`src/services/record/live.ts:1479-1508` — the whole of the settle path:

```ts
payCredit(id, input) {
  return Effect.gen(function* () {
    if (!Number.isFinite(input.pay) || input.pay < 0 || !Number.isFinite(input.rounding)) {
      return yield* Effect.fail(
        new RecordError({ message: "Pembayaran atau pembulatan tidak valid" }),
      );
    }
    const methods = yield* db.selectMany<MethodRow>(SELECT_METHODS_FOR("$1"), [id])…
    // … index === 0 ? input.pay : 0 …
    statements.push({
      sql: `UPDATE records SET
          record_pay = $1, record_rounding = $2,
          record_paid_at = $3, record_updated_at = $3, record_sync_at = NULL
        WHERE record_id = $4`,
      bindings: [input.pay, input.rounding, now, id],
    });
```

What the guard does **not** do:

* it never reads the record first, so it cannot tell a credit from a cash sale,
  a deleted row, or an already-settled one — the `UPDATE … WHERE record_id = $4`
  has no `AND record_credit_at IS NOT NULL AND record_paid_at IS NULL`;
* it never compares `input.pay` against what is owed. The debt list is
  `SELECT_DEBT` (`src/services/record/live.ts:353-361`), which is
  `record_credit_at IS NOT NULL AND record_paid_at IS NULL` — so stamping
  `paid_at` with `record_pay = 0` removes the debt from every view.

The only thing that prevents either is the dialog: `src/pages/Record/Item/z-Detail/z-Debt/use-debt.ts:29-41`

```ts
const required = new Decimal(grandTotal).plus(rounding);
if (required.gt(pay)) {
  setValidationError("Pembayaran tidak cukup, minimal " + …);
  return;
}
```

plus `z-Debt/index.tsx:93` (`disabled={isSubmitting || change < 0}`). That is
client-only, and `grandTotal` there is whatever the dialog's props carried.

Contrast with the rest of the same file, where the boundary *is* enforced in the
service: `transaction.submit` rejects `line.price < 0`, `!Number.isInteger(line.unit)`,
`!Number.isFinite(line.qty)`, a blank manual name, an underpaid sale
(`src/services/transaction/live.ts:718-780`), and `record.add.draft` rejects the
same set again (`draft.test.ts` covers each). `record.import` got the same
treatment in iteration 5 (`src/services/record/validate-line.ts`).

## Why it matters

Settling a credit is the one place where typing the wrong number *deletes* a
debt. The mechanism that makes that dangerous — `paid_at` is the debt flag —
lives in SQL, one layer below the only check. Any new caller (a future
"settle all today" button, a keyboard shortcut, a script calling the service in a
test or the e2e harness) inherits the hole, and the failure is silent: the
record looks paid, the Debt page no longer lists it, and nothing in the log says
the amount did not cover the total.

## Recommended fix

Add the state + amount guard inside `payCredit`, in the same shape as
`transaction.submit`'s pre-flight:

1. Read the record's `record_credit_at`, `record_paid_at`, `record_total`,
   `record_fix`, `record_deleted_at` first (`readRecord(id)` already exists in
   this file).
2. Fail with a typed `RecordError` when it is deleted, when
   `record_credit_at IS NULL` (not a credit), or when `record_paid_at !== null`
   (already settled — say so rather than overwrite).
3. Round both sides at `record_fix` and fail when
   `roundMoney(pay, fix) < roundMoney(total + rounding, fix)`, with the same
   Indonesian sentence the dialog uses. A legitimate write-off stays possible —
   it is just explicit, as `rounding`.
4. Put the state condition in the `UPDATE` too
   (`AND record_credit_at IS NOT NULL AND record_paid_at IS NULL`), so a race
   with a second settle of the same record fails instead of double-writing.

Then the dialog's own check becomes UX (keep it — it is the fast feedback), not
the only line of defence.

## Acceptance criteria

- `record.set.payCredit` on a cash record, on a deleted record, and on an
  already-settled credit fails with a typed `RecordError` and writes nothing.
- `payCredit` with `pay` below `total + rounding` (at the record's fix) fails and
  leaves `record_paid_at` null.
- A legitimate settlement, a split-method settlement, and an explicit
  `rounding`-as-write-off still succeed (the existing `credit.test.ts` cases stay
  green).
- The `UPDATE` carries the unsettled-credit condition.

## Verification

`bun test src/services/record/credit.test.ts`. Add four cases to that file:
cash record refused, deleted record refused, already-paid credit refused,
underpaid refused — each asserting `record_paid_at` is unchanged afterwards.
`tsc --noEmit` and `eslint` stay clean.
