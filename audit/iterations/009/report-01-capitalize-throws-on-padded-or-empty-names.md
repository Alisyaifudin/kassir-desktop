---
slug: capitalize-throws-on-padded-or-empty-names
title: "`capitalize()` throws on a name with a double/trailing space or an empty cashier, which can take down the login picker"
severity: medium
category: correctness
iteration: 9
created: 2026-10-21T21:31:45.459Z
files:
  - "src/lib/utils.ts"
  - "src/pages/Login/z-LoginForm.tsx"
  - "src/pages/Record/z-Record/List.tsx"
  - "src/lib/receipt/build-header.ts"
  - "src/lib/utils.test.ts"
---

# `capitalize()` throws on a name with a double/trailing space or an empty cashier, which can take down the login picker

- **Severity:** medium
- **Category:** correctness
- **Files:** `src/lib/utils.ts`, `src/pages/Login/z-LoginForm.tsx`, `src/pages/Record/z-Record/List.tsx`, `src/lib/receipt/build-header.ts`, `src/lib/utils.test.ts`
- **Iteration:** 9

## Summary

`capitalize()` maps `t[0].toUpperCase()` over `name.split(" ")`, so any empty segment — a name with a double space inside, or an empty cashier from a legacy/imported record — makes `t[0]` undefined and throws a TypeError during render. It is called on `cashier.name` in the login picker, and on `record.cashier` in the day list and the receipt header, so a single bad row blanks the screen (and, on `/login`, locks the account picker out). The project's own writers trim, but nothing trims inner whitespace and `add.external` accepts `cashier: ""`; `src/lib/utils.test.ts` has no case for it.

## Details

## Evidence

`src/lib/utils.ts:109`:

```ts
export function capitalize(name: string): string {
  const terms = name.split(" ");
  return terms.map((t) => t[0].toUpperCase() + t.slice(1)).join(" ");
}
```

`"Budi".split(" ")` → `["Budi"]` (fine). `"Budi  Santoso".split(" ")` → `["Budi", "", "Santoso"]`,
and `""[0]` is `undefined`, so `t[0].toUpperCase()` throws
`TypeError: Cannot read properties of undefined (reading 'toUpperCase')` **during render**.
The same happens for `""` (→ `[""]`), i.e. an empty name.

Call sites that render it directly (no try/catch anywhere between them and the render):

- `src/pages/Login/z-LoginForm.tsx:76` and `:80` — the account picker: `capitalize(cashier.name).charAt(0)` and
  `capitalize(cashier.name)`. This screen renders **before** auth, so one bad cashier row locks the app.
- `src/pages/Record/z-Record/List.tsx:129` — every row of the day list: `capitalize(record.cashier)`.
- `src/lib/receipt/build-header.ts:41` — `"Kasir: " + capitalize(record.cashier)`, which runs inside the
  receipt build, so printing fails too.
- `src/pages/Record/Item/z-Receipt/z-Header.tsx:38`, `src/pages/Record/z-Detail/index.tsx:57`,
  `src/pages/Record/Item/z-Detail/z-Meta.tsx:18`, `src/pages/Home/z-Header.tsx:16`,
  `src/pages/Pos/z-CashierName.tsx:11`, `src/pages/Restock/z-CashierName.tsx:11`,
  `src/pages/Setting/z-Header.tsx:14`.

How a bad value can exist:

- Inner whitespace is never normalised. `src/pages/Cashier/use-new-cashier.ts:10,27` and
  `src/pages/Cashier/use-rename.ts` both use `z.string().trim()` / `input.trim()`, which strip only the
  **ends**; `"Budi  Santoso"` typed with a double space (or a pasted name with a stray space) is stored as-is.
  `record.cashier` then carries it into the day list, the receipt and the record detail.
- Legacy/imported rows may carry an empty name: `src/pages/Setting/Data/RecordUpload/util-validate-record.ts`
  validates `cashier: z.string()` with no `nonempty`, and `src/services/record/validate-line.ts` has no
  cashier check. An imported backup with `"cashier": ""` is accepted, and
  `src/pages/Record/z-Record/List.tsx:129` renders `capitalize("")`, which throws.

`src/lib/utils.test.ts` covers `integer`, `numerish` and `parseRange` only — `capitalize` has no test, so this
is untested behaviour in a helper with 11 importers.

## Why it matters

A name is the least-validated field in the app and the most widely rendered. Because `capitalize` throws in the
render phase rather than returning the input, one row with an odd name is not a cosmetic glitch — it replaces
the whole screen with the route error boundary. On `/login` that is an app that cannot be opened at all
(the picker throws before a cashier can be selected), which is a support call with no in-app remedy. On
`/records` it silently hides the day's transactions, and the same string is on the receipt path.

## Recommended fix

Make the helper total and split on runs of whitespace instead of single spaces:

```ts
/**
 * Title-case a display name. Total on purpose: names reach this from forms, the
 * import path and legacy rows, and a double space or an empty string must render
 * (as-is) rather than throw in the middle of a list.
 */
export function capitalize(name: string): string {
  return name
    .split(/\s+/)
    .filter((term) => term !== "")
    .map((term) => term[0].toUpperCase() + term.slice(1))
    .join(" ");
}
```

Then, so the invariant is not only defensive:

1. `src/pages/Setting/Data/RecordUpload/util-validate-record.ts`: `cashier: z.string().trim().min(1, …)`
   (the import already reports the offending record index, so the operator gets a usable message).
2. Keep names canonical on the way in: `service.cashier.add` / `cashier.set.name` should store
   `name.trim().replace(/\s+/g, " ")` so the DB never holds the padded form that made this reachable.

## Acceptance criteria

- `capitalize("")`, `capitalize(" ")`, `capitalize("Budi  Santoso")` and `capitalize(" Budi ")` return strings
  and never throw; `capitalize("Budi  Santoso") === "Budi Santoso"`.
- `src/lib/utils.test.ts` has a `describe("capitalize")` covering those four inputs plus a normal one.
- A cashier record whose stored name is `"Budi  Santoso"` renders the login picker, the Records day list, the
  record detail and the receipt without an error boundary.
- `add.external` refuses a record with `cashier: ""` with a message naming the record index.

## Verification

```
bun test src/lib/utils.test.ts        # new capitalize cases fail before, pass after
bunx tsc --noEmit && bunx eslint . --max-warnings 0
```

Manual: in a dev build, `UPDATE cashiers SET cashier_name = 'Budi  Santoso'` (or import a JSON with a doubled
space) then open `/login`, `/records` and print one receipt — all three render.
