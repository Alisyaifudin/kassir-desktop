---
slug: raw-sqlite-errors-rendered-to-cashier
title: "Raw SQLite error text is rendered to the cashier, while the Rust side already logs internals and returns a sentence"
severity: medium
category: ux
iteration: 9
created: 2026-10-21T21:32:11.782Z
files:
  - "src/services/db/live.ts"
  - "src/services/db/index.ts"
  - "src/services/record/live.ts"
  - "src/lib/utils.ts"
  - "src/pages/Record/z-Error.tsx"
  - "src/pages/Money/z-Error.tsx"
  - "src/pages/Debt/z-Error.tsx"
---

# Raw SQLite error text is rendered to the cashier, while the Rust side already logs internals and returns a sentence

- **Severity:** medium
- **Category:** ux
- **Files:** `src/services/db/live.ts`, `src/services/db/index.ts`, `src/services/record/live.ts`, `src/lib/utils.ts`, `src/pages/Record/z-Error.tsx`, `src/pages/Money/z-Error.tsx`, `src/pages/Debt/z-Error.tsx`
- **Iteration:** 9

## Summary

`db/live.ts` composes every failure as `Gagal mengeksekusi query: \n<raw driver text>`, the domain services copy that string into their own error `message` verbatim, and the page fallbacks render `error.message` — so a locked or corrupt database shows the cashier an English SQLite sentence with an embedded newline and table names, while the Rust commands in the same repo carefully log internals and return one Indonesian sentence. There is no `detail` field to log, so the diagnostic exists only where it is least useful.

## Details

## Evidence

Every SQLite failure is wrapped with the raw driver text still inside the cashier-facing message.

`src/services/db/live.ts` (four places — `:28`, `:37`, `:47`, `:64`):

```ts
catch: (e) => new DbError({ message: `Gagal mengeksekusi query: \n${formatError(e)}` }),
…
catch: (e) => new DbError({ message: `Gagal mengeksekusi transaksi: \n${formatError(e)}` }),
```

`formatError` (`src/lib/utils.ts:154`) returns `e.message` for any `Error`, i.e. the string the
`tauri-plugin-sql` layer produced (`near "FROM": syntax error`, `database is locked`,
`no such table: records`, `FOREIGN KEY constraint failed`, …).

Domains then keep that text verbatim when they re-tag the error:

- `src/services/record/live.ts:292` — `function dbErrorToRecordError(error: DbError) { return new
  RecordError({ message: error.message }); }`
- the same one-liner shape in `product/live.ts`, `money/live.ts`, `listing/live.ts`, and the transaction layer's
  `toError` (`src/services/transaction/live.ts`, `new TransactionError({ message: error.message })`).

And the UI prints `error.message` straight into the page:

- `src/pages/Record/z-Error.tsx:16` (page fallback) and `:24` (inline `TextError`)
- `src/pages/Money/z-Error.tsx:8` — `title="Catatan keuangan bermasalah ☠">{error.message}</ErrorComponent>`
- `src/pages/Debt/z-Error.tsx:11`
- `Loader` throws the typed error into `createErrorBoundary`, so any `TextError>{error.message}` under a data
  read has the same exposure.

This directly contradicts the standard the Rust side already holds itself to, in the same repository:

- `src-tauri/src/export.rs`: "The raw OS error is a developer detail: log it, do not render it."
- `src-tauri/src/printer.rs`: the spooler error goes to `log::error!` and the cashier gets
  "Gagal menyiapkan berkas cetak."

There is no second channel: `DbError` carries only `message`, so once the raw text is dropped there is nothing
left to log at the service layer (the log line is written in Rust for the printer, but not for SQL).

## Why it matters

The cashier's screen is a 800×600 POS terminal, and the message they get is an English SQLite sentence with an
embedded `\n` (which also breaks the layout of the `TextError` paragraph). It is unactionable for them, it reads
as a crash, and on a shared till it leaks schema names and table/column identifiers to whoever is standing
there. Meanwhile the operator cannot tell "the disk is full" from "the file is corrupt" from "a bug in a query",
because the one thing that would help — the diagnostic — is what was printed instead of logged.

## Recommended fix

Split the diagnostic from the sentence, at the boundary that is closest to the driver:

```ts
// src/services/db/index.ts
export class DbError extends Data.TaggedError("DbError")<{
  message: string;   // cashier-facing, Indonesian, one sentence
  detail: string;    // driver text — log only, never rendered
}> {}
```

```ts
// src/services/db/live.ts
catch: (e) => {
  log.error(`db: ${queryName} failed: ${formatError(e)}`);
  return new DbError({ message: "Data gagal dibaca. Coba lagi.", detail: formatError(e) });
}
```

Keep `detail` out of every render path: `dbErrorToRecordError` and friends should map to a message chosen for
the operation (`"Catatan gagal disimpan. Coba lagi."`, `"Produk gagal dimuat. Coba lagi."`), and the raw text
must not be copied into `RecordError.message` / `ProductError.message`. `ErrorComponent`/`TextError` then render
a sentence the cashier can act on, and Setting → Log has the actual cause. Where a failure is genuinely
actionable (disk full), detect it explicitly (`/disk|full|SQLITE_FULL/i` on the driver text) and say so.

## Acceptance criteria

- No `DbError`/`RecordError`/`ProductError`/`MoneyError` `message` contains a raw driver string; a unit test
  asserts that a failing statement produces an Indonesian sentence that does not include the SQLite text.
- The injected failure still reaches the app log (`src/lib/log.ts` / Setting → Log) with the driver text.
- Rendering a page whose query fails shows one short sentence with no newline and no table names.
- Grep guard: `error.message` is not the sole content of an `ErrorComponent`/`TextError` fed by a `DbError`
  descendant without the mapping above.

## Verification

```
bun test src/services/record src/services/product src/services/money   # new message-shape assertions
bunx tsc --noEmit && bunx eslint . --max-warnings 0
```

Manual: rename `data.db`'s `records` table in a scratch copy (or revoke write access) and open `/records`,
`/money`, `/debt` — each shows a short Indonesian sentence, and Setting → Log holds the driver error.
