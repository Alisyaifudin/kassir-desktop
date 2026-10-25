---
slug: record-import-accepts-negative-qty-and-price
title: "JSON import accepts negative quantities and prices, corrupting the stock journal silently"
severity: medium
category: correctness
iteration: 3
created: 2026-10-21T18:47:05.083Z
files:
  - "src/pages/Setting/Data/RecordUpload/util-validate-record.ts"
  - "src/pages/Setting/Data/RecordUpload/z-Selected.tsx"
  - "src/services/record/live.ts"
  - "src/services/record/index.ts"
  - "src/services/product/stock-sql.ts"
---

# JSON import accepts negative quantities and prices, corrupting the stock journal silently

- **Severity:** medium
- **Category:** correctness
- **Files:** `src/pages/Setting/Data/RecordUpload/util-validate-record.ts`, `src/pages/Setting/Data/RecordUpload/z-Selected.tsx`, `src/services/record/live.ts`, `src/services/record/index.ts`, `src/services/product/stock-sql.ts`
- **Iteration:** 3

## Summary

The Settings → Data JSON import validates shape but not values: `z.number()` with no sign/positivity checks, and `record.add.external` skips the `qty > 0` / `price >= 0` / `unit >= 1` validation that the sibling `add.draft` performs. An imported sale line with `qty: -3` writes a record with a negative total while moving no stock (FIFO stops at `remaining > 0`), and the same line on a purchase creates a negative lot in `stocks`/`product_events` — permanent event-sourced history that nothing reports as an error.

## Details

## Evidence

**The trust boundary**: `src/pages/Setting/Data/RecordUpload/util-validate-record.ts` parses a user-chosen JSON file. Every money and quantity field is validated for *shape only*:

```ts
const listingSchema = z.object({
  listingId: z.string().nullable(),
  name: z.string(),
  kind: z.string(),
  price: z.number(),     // no .nonnegative()
  qty: z.number().int(), // no .positive()
  capital: z.number(),   // no .nonnegative()
  total: z.number(),
  discounts: z.array(discountSchema),
});

const recordSchema: z.ZodType<RecordImport> = z.object({
  paidAt: z.number().int(),
  rounding: z.number(),
  ...
  subTotal: z.number(),
  total: z.number(),
  methods: z.array(z.object({ methodId: z.string().nonempty(), pay: z.number() })),
  ...
});
```

**What consumes it**: `src/pages/Setting/Data/RecordUpload/z-Selected.tsx` loops the file and calls `service.record.add.external(record)` once per record. `add.external` (`src/services/record/live.ts:873`) writes the record and moves stock with **no** numeric validation. Compare the sibling entry point that a live cart uses, `add.draft` (`live.ts:1053`), which does validate:

```ts
// live.ts:1062-1075
              if (!Number.isFinite(line.qty) || line.qty <= 0) {
                return yield* Effect.fail(
                  new RecordError({ message: "Jumlah barang tidak valid" }),
                );
              }
              if (!Number.isInteger(line.unit) || line.unit < 1) { … }
              if (!Number.isFinite(line.price) || line.price < 0) { … }
```

`add.external` has no equivalent block; it goes straight from `for (const line of input.listings)` into stock movement.

**The concrete failure path** — a line with `qty: -3` in an `incoming` (sale) record:

```ts
// live.ts:940ish
              const pcs = line.qty * link.listing_unit;   // -3
              const { statements: consumed, shortage, portions } = consumeStatements(
                link.product_id, lots, pcs, now, "", recordId,
              );
              if (shortage > 0) { … }                      // shortage === -3, so no failure
```

and `consumeStatements` (`src/services/product/stock-sql.ts:106`) starts with `remaining = pcs` and loops `while remaining > 0`, so a negative amount produces **no** stock statements and reports `shortage = -3`. Result: a `records` row with a negative `record_total` and a `record_listings` row with `qty -3`, a `product_events` journal with nothing in it, and a `stocks` cache that still holds the pre-import level. Analytics, the money screen and the stock badges all keep reading a record that claims goods left without stock moving.

The mirror case is a purchase (`outcoming`) with `qty: -3`, which calls `receivePortion(link.product_id, { value: line.qty * link.listing_unit /* -3 */, capital: … })` — creating a *negative* lot and a negative opening event in `stocks`/`product_events`.

The same file is the documented import format: `RecordUpload/z-Schema.tsx` shows the JSON so operators can hand-edit/merge backups before importing.

## Why it matters

Settings → Data is the recovery path: it is what a shop uses to restore a store's history onto a new PC or repair a corrupted file. It is also the only place where the app accepts structured data from outside its own writers, and it is the only such boundary in the codebase that skips value validation — every cart edit goes through `add.draft`'s checks, and `transaction.submit` re-validates again. An off-by-a-sign edit, a merge from another store, or a spreadsheet round-trip that turns empty cells into `0`/negative values silently corrupts the stock journal and the profit numbers, and nothing reports it: the per-record loop catches `RecordError` and shows the record as "skipped" only when the effect fails, which a negative qty never does.

Severity is medium rather than high because the input is the operator's own file, not remote data — but it is the one boundary where a bad file is *more* likely than a bad keystroke, and stock is event-sourced, so a wrong event is permanent history.

## Recommended fix

1. Tighten the schema in `util-validate-record.ts` to the same invariants as the cart path:
   `qty: z.number().int().positive()`, `price: z.number().nonnegative()`, `capital: z.number().nonnegative()`, `pay: z.number()`, `rounding: z.number()`, `fix: z.number().int().min(0).max(100)`, and a `z.array(listingSchema).min(1)` on `listings`. Reject the whole file rather than silently skipping (`recordsSchema` already `.min(1)` — extend the idea).
2. Share the validation instead of duplicating it: extract the `add.draft` line checks (`live.ts:1057-1076`) into a pure `validateListingLine(line): string | null` in `src/services/record/` (next to `capital.ts`), call it from `add.draft`, `add.external` **and** from the Zod `superRefine` so the boundary and the service agree by construction.
3. In `add.external`, also assert the record's arithmetic before writing: `subTotal` equals the sum of the line totals, and `total === subTotal + Σ extra.eff` within `fix`. A backup whose lines and totals disagree is the single most likely corruption and it costs nothing to detect.
4. Report skipped records with the file line/index in the message the `SkippedItems` panel already renders (`z-Selected.tsx` passes `key: \`${index}\``), so the operator can find the offending record.

## Acceptance criteria

- A JSON file with `qty: -1`, `price: -1`, `qty: 0`, a fractional `qty`, a `fix` outside 0..100, or `listings: []` is rejected before anything is written, with an Indonesian message naming the offending record.
- `validateListingLine` is the single implementation used by `add.draft` and `add.external`; there is no second copy of the `qty <= 0` / `price < 0` rules.
- A record whose `total` does not match its lines is skipped with a message, not imported.
- After importing a valid file, `stocks.stock_value`, the `product_events` sum and the record's `qty` agree for every line (a test can assert `Σ product_event_value === Σ stock_value` per product).

## Verification

- New unit test next to `src/services/record/draft.test.ts`: `add.external` rejects a negative qty / negative price / zero-qty-only record with `RecordError`, and a valid one still writes its lots (reuse the sql.js fixture harness those tests already use).
- New unit test for `util-validate-record.ts` `extractRecord` with a `File` stub (the repo already stubs `File`/`Blob` in `image` tests): each bad field produces `JsonError`.
- Manual: Settings → Data → Riwayat, drop a JSON with one `qty: -3` line and confirm the file is refused (or the record is reported as skipped) and `stocks` is untouched — check with Settings → Log / a stock badge before and after.
