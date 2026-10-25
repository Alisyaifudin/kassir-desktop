---
slug: integer-and-numerish-zod-helpers-never-reject
title: "`integer` / `numerish` can never reject, so a malformed `?page=` renders an empty list and a malformed `?start=` crashes the screen"
severity: medium
category: correctness
iteration: 7
created: 2026-10-21T20:42:53.624Z
files:
  - "src/lib/utils.ts"
  - "src/pages/Product/use-list-state.ts"
  - "src/pages/Product/page.tsx"
  - "src/pages/Record/Search/use-range.tsx"
  - "src/pages/Money/use-range.tsx"
  - "src/components/Calendar.tsx"
  - "src/hooks/use-scroll.ts"
---

# `integer` / `numerish` can never reject, so a malformed `?page=` renders an empty list and a malformed `?start=` crashes the screen

- **Severity:** medium
- **Category:** correctness
- **Files:** `src/lib/utils.ts`, `src/pages/Product/use-list-state.ts`, `src/pages/Product/page.tsx`, `src/pages/Record/Search/use-range.tsx`, `src/pages/Money/use-range.tsx`, `src/components/Calendar.tsx`, `src/hooks/use-scroll.ts`
- **Iteration:** 7

## Summary

`integer` and `numerish` in `src/lib/utils.ts` are written with `||` instead of `&&`, so the "must be a number / a whole number" rule is unreachable: `integer.parse("abc")` succeeds and yields `NaN`, and `numerish` accepts `""` as `0`. Five URL parsers trust them, and the result is observable: `#/products?page=abc` renders an empty list with a `NaN/NaN` footer and a live "previous page" button, and `#/records/search?start=3.7` throws `RangeError` out of `Temporal.Instant.fromEpochMilliseconds` into the route error boundary — the `.catch(default)` fallback was written for exactly this and never fires.

## Details

## Evidence

`src/lib/utils.ts:7-19` — the two URL/form numeric helpers:

```ts
export const numerish = z.string().refine((val) => val !== "" || !isNaN(Number(val)), {
  message: "Harus angka",
});

export const numeric = numerish.transform((val) => Number(val));

export const integer = z
  .string()
  .refine((val) => val !== "" || !isNaN(Number(val)) || !Number.isInteger(Number(val)), {
    message: "Harus angka bulat",
  })
  .transform((v) => Number(v));
```

Both refines are disjunctions, so the *second* and *third* conditions can never
change the answer:

- `integer`: for any non-empty string the first clause (`val !== ""`) is already
  `true`, so the refine returns `true` for `"abc"`, `"3.7"`, `"1e999"` — the
  "must be a whole number" rule is dead code. (It reads as if `&&` was meant.)
- `numerish`: passes the empty string, and then `Number("") === 0`, so an empty
  field silently becomes zero rather than "empty".

Consumers that trust it:

| file | line | what the URL param becomes |
|---|---|---|
| `src/pages/Product/use-list-state.ts` | 64 | `page: Math.max(1, integer.catch(1).parse(params.get("page")))` |
| `src/pages/Record/Search/use-range.tsx` | 36-39 | `start` / `end` epoch millis → `Temporal.Instant.fromEpochMilliseconds(end)` |
| `src/pages/Money/use-range.tsx` | 38-41 | same |
| `src/components/Calendar.tsx` | 285 | `numeric.safeParse(formData.get("year"))` |
| `src/hooks/use-scroll.ts` | 10, 29 | `?scroll=` restored position |

Two concrete failures, both reachable by a hand-edited or stale hash URL
(`#/products?page=abc`, `#/records/search?start=3.7`):

1. **`/products?page=abc` renders an empty list.** `integer.parse("abc")` →
   `NaN`, `Math.max(1, NaN)` → `NaN`, so `page.tsx:67-69` computes
   `page = Math.min(NaN, totalPage)` → `NaN`,
   `start = (NaN - 1) * size` → `NaN`, and `filtered.slice(NaN, NaN + size)` →
   `[]`. The page shows a blank table while `filtered.length > 0`, so the
   "empty catalogue" fallback does not trigger either. `ListFooter` then renders
   `NaN/NaN` and, because `page <= 1` is `false` for `NaN`,
   the "previous page" button is enabled and writes `page - 1` = `NaN` again.
2. **`/records/search?start=3.7` throws during render.**
   `Temporal.Instant.fromEpochMilliseconds(3.7)` (and `NaN`) throws a
   `RangeError`, so the whole screen lands in the route error boundary with
   "Aplikasi bermasalah" — the same for `/money`, since `Money/use-range.tsx` is
   the same code. The `integer.catch(defaults.start)` fallback that was written
   for exactly this case never fires.

## Why it matters

A shared validator that cannot fail is worse than no validator: five call sites
believe bad input has been rejected, and the two symptoms are the ones hardest to
diagnose — a silently empty list on the catalogue screen, and a `RangeError`
crash whose stack points at `temporal-polyfill`, not at the URL parse. A user
can trigger both by following an old link, by using Back after a range change, or
by typing the URL; neither is recoverable from inside the screen.

It also means the `integer` name is a lie to the next author, who will reach for
it whenever a whole number is required (a page, a quantity, a fix, a stock lot).

## Recommended fix

Rewrite both as conjunctions and keep `.transform` semantics:

```ts
export const numerish = z
  .string()
  .trim()
  .min(1, { message: "Harus angka" })
  .refine((val) => Number.isFinite(Number(val)), { message: "Harus angka" });

export const integer = z
  .string()
  .trim()
  .min(1, { message: "Harus angka bulat" })
  .refine((val) => Number.isSafeInteger(Number(val)), { message: "Harus angka bulat" })
  .transform((v) => Number(v));
```

If the empty string really must mean zero somewhere, that belongs in the caller,
not in a helper named "numeric".

Then harden the two range hooks: parse the epoch millis *and* bound them
(`Number.isSafeInteger(x) && x >= EARLIEST && x <= FURTHEST`, the constants
`use-time.ts:8-16` already defines) before handing them to `Temporal`, so a
malformed param falls back to the default range instead of throwing.

## Acceptance criteria

- `integer.safeParse("abc")`, `("3.7")`, `("")`, `("NaN")` all fail;
  `("42")` and `("-1")` succeed.
- `numerish.safeParse("")` fails; `("68000")`, `("68000,5")`→ no (comma stays the
  caller's job) — at minimum `("abc")` fails.
- `#/products?page=abc` and `?page=3.7` render page 1 with the full list and a
  working footer.
- `#/records/search?start=abc` and `?start=3.7` render the default last-month
  range instead of throwing; same for `#/money?start=abc`.
- New `src/lib/utils.test.ts` cases cover all of the above, plus the two range
  hooks (a pure `parseRange(params)` extraction makes that testable without RTL).

## Verification

`bun test src/lib` then the new page-level range test. Manual: open
`#/products?page=abc`, `#/records/search?start=3.7`, `#/money?start=abc`.
`tsc --noEmit`, `eslint`.
