---
slug: oversized-service-modules
title: "`record/live.ts` (1,778) and `transaction/live.ts` (1,193) are the two most bug-prone files and break the one-function-per-file rule"
severity: medium
category: maintainability
iteration: 4
created: 2026-10-21T19:21:10.732Z
files:
  - "src/services/record/live.ts"
  - "src/services/transaction/live.ts"
  - "src/services/product/live.ts"
  - "src/services/product/stock-sql.ts"
---

# `record/live.ts` (1,778) and `transaction/live.ts` (1,193) are the two most bug-prone files and break the one-function-per-file rule

- **Severity:** medium
- **Category:** maintainability
- **Files:** `src/services/record/live.ts`, `src/services/transaction/live.ts`, `src/services/product/live.ts`, `src/services/product/stock-sql.ts`
- **Iteration:** 4

## Summary

Three service files hold 3,956 lines between them — `record/live.ts` alone has 26 top-level declarations, ten SQL constants, all statement builders and one 426-line `Effect.gen` for `add.draft` — against `.agent/agent.md`'s "one function per file / small and single-purpose" rule. Every correctness bug this series filed in these files had to be located by reading hundreds of lines of builder code, and the coarse granularity is why the record service can only be tested through whole-cart integration cases. The in-repo precedent (`product/stock-sql.ts`) shows the split that makes statements unit-testable.

## Details

## Evidence

`wc -l` over `src/services`:

```
1778  src/services/record/live.ts
1193  src/services/transaction/live.ts
 985  src/services/product/live.ts
 382  src/services/money/live.ts
```

`.agent/agent.md` is explicit about the shape these files are supposed to have: "kebab-case for all non-component files… **One function per file** — each database/transaction/server operation is its own file", "Files are small and single-purpose", and the module barrel pattern where `index.ts` only wires named operations.

`src/services/record/live.ts` is the clearest violation. In one file: 26 top-level declarations (`grep -c '^function \|^const '`), ten SQL string constants (`SELECT_SUMMARY:227`, `SELECT_LISTINGS:247`, `SELECT_DEBT:374`, `SELECT_MOVES:366`, `SELECT_LOTS:382`, `SELECT_SURVIVING_EVENTS:390`, `SELECT_TOUCHED_LOTS:399`, `SELECT_JOURNALED_PRODUCTS:410`, `SELECT_LISTING_LINK:415`, `SELECT_LISTING_HISTORY:285`), the statement builders (`insertRecordStatement:420`, `insertPortion:452`, `insertDiscounts:491`), the read-model regroupers (`rowToRecord:317`, `regroupListings:517`), the transaction internals (`method/draft/count/set/delete` under one `Layer.effect` at `:585-1778`), and the FIFO/lot restore logic (`touchedLots:736`, `restoreLot:786`). `add.draft(input)` alone runs from `:1072` to `:1498` — a **426-line single `Effect.gen`** that decides validation, product/listing creation, FIFO lot allocation, capital allocation, supplier snapshotting, discount/extra/portion writes, image moves and the cart-row delete.

The same shape applies to `transaction/live.ts` (cart refs + debounce/flush + 25 statement builders + submit + unsubmit + delete in 1,193 lines) and `product/live.ts` (985).

There is already a good precedent in-repo: `src/services/product/stock-sql.ts` (314 lines) holds the FIFO/lot statement builders as pure, unit-tested functions, and `src/services/record/validate-line.ts` / `capital.ts` were split out the same way last iteration.

## Why it matters

Not a style complaint — a locatability problem with a measured cost. Every correctness bug this audit series has filed in these files had to be found by reading hundreds of lines of SQL builder to answer "where does this write happen?":

- the negative-quantity import (`record-import-accepts-negative-qty-and-price`) lived inside the 426-line `add.draft`;
- the `written`/`statementsForChange` diff writer (`transaction/live.ts:390-476`) sits 200 lines from the `flush` that consumes it;
- `unsubmit` (`transaction/live.ts:863-1053`) re-derives a cart from a record with 190 lines of inline SQL that duplicates `byId`'s read model.

It also means the tested surface is coarse: `record/live.ts` can only be exercised through a whole `add.draft` (which is why `src/services/record/draft.test.ts` is 624 lines of integration-ish cases), so a bug in, say, `insertDiscounts` cannot be pinned by a 5-line unit test the way `stock-sql.test.ts` pins `drainStatements`.

## Recommended fix

Extract by *statement*, following `stock-sql.ts`, keeping the public `RecordService` shape unchanged (the barrel is what `.pi/skills/services.md` documents — do not change the service surface):

1. `src/services/record/sql/select-*.ts` — move each `SELECT_*` constant to its own file next to the row type it decodes (`select-summary.ts`, `select-listing-history.ts`, `select-debt.ts`, …).
2. `src/services/record/sql/insert-*.ts` — `insertRecordStatement`, `insertPortion`, `insertDiscounts` as `(input) => Statement[]`, each with a `*.test.ts` asserting the SQL shape and the binding order (the pattern `src/services/db/transaction.test.ts` already uses).
3. `src/services/record/draft/` — pull `add.draft` apart into pure steps that return statements: `validate.ts` → `lines.ts` (catalog/manual line resolution) → `lots.ts` (FIFO, reuse `product/stock-sql.ts`) → `capital.ts` (already exists) → `assemble.ts`. `add.draft` then becomes ~60 lines of `yield*` composition.
4. Same for `transaction/live.ts`: `sql/*.ts` for the 25 statement builders, and keep only the reactive core (refs, timers, `flush`) in `live.ts`.
5. Do not change any SQL text while moving it — the group is fingerprinted by behaviour through the existing tests, and a "tidy the query" pass inside a move makes the review impossible.

## Acceptance criteria

- No file under `src/services/` exceeds ~400 lines; no `Effect.gen` body exceeds ~80 lines.
- `RecordService` / `TransactionService` / `ProductService` public shapes are unchanged (`src/services/*/index.ts` untouched apart from imports).
- Statement builders are pure and unit-tested: an `insertPortion` test asserts the SQL and bindings without a database, mirroring `stock-sql.test.ts`.
- `bun test` stays at ≥242 passing with no test rewritten to accommodate a behaviour change.

## Verification

- `bun test` — in particular `submit.test.ts`, `draft.test.ts`, `catalogue.test.ts`, `flush.test.ts`, `import.test.ts`, `credit.test.ts` must pass unmodified.
- `wc -l src/services/**/*.ts` before/after in the PR description.
- `bun run typecheck && bun run lint`.
