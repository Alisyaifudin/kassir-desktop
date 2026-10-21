---
slug: shared-helpers-reimplemented-locally
title: "Shared `numerish`, `useRecordRevision` and `getURLBack` all have drifted private copies in the pages"
severity: low
category: maintainability
iteration: 10
created: 2026-10-21T21:52:55.282Z
files:
  - "src/pages/Record/Item/z-Detail/z-Debt/use-debt.ts"
  - "src/lib/utils.ts"
  - "src/pages/Debt/use-data.ts"
  - "src/pages/Money/History/use-data.ts"
  - "src/hooks/use-record-revision.ts"
  - "src/hooks/use-generate-url-back.ts"
---

# Shared `numerish`, `useRecordRevision` and `getURLBack` all have drifted private copies in the pages

- **Severity:** low
- **Category:** maintainability
- **Files:** `src/pages/Record/Item/z-Detail/z-Debt/use-debt.ts`, `src/lib/utils.ts`, `src/pages/Debt/use-data.ts`, `src/pages/Money/History/use-data.ts`, `src/hooks/use-record-revision.ts`, `src/hooks/use-generate-url-back.ts`
- **Iteration:** 10

## Summary

Three shared helpers have private copies in the pages that needed them most: `use-debt.ts` defines its own `numeric` that accepts the empty string (the exact hole the shared `numerish` documents and closes — recurring from iteration 9), `Debt/use-data.ts` and `Money/History/use-data.ts` each carry a byte-identical `useRevision` while `hooks/use-record-revision.ts` exists precisely to stop that, and `use-generate-url-back.ts` re-parses `url_back` a third time with a weaker rule.

## Details

## Evidence

Three cases of the same root cause: a shared helper exists, is documented, and a page still carries a private copy that has already drifted (or is a third identical copy).

**1. A local `numeric` that re-introduces the empty-string hole the shared one was written to close.**

`src/pages/Record/Item/z-Detail/z-Debt/use-debt.ts:9-10`:

```ts
const numeric = z.string().refine((value) => Number.isFinite(Number(value)));
const schema = z.object({ pay: numeric, rounding: numeric });
```

`src/lib/utils.ts:17-30` is the shared version, and its comment names the exact bug this local copy repeats:

```ts
// The "must be a number" rule is a conjunction, not a disjunction: with `||`
// every non-empty string passed and `integer.parse("abc")` produced `NaN`, …
// The empty string is rejected too — it is "no value", not zero; a caller that
// wants zero says so.
export const numerish = z.string().trim().min(1, …).refine((val) => Number.isFinite(Number(val)), …);
```

`Number("")` is `0`, so the local schema accepts an empty "Bayaran" field as `0`, accepts `" "`, and accepts `"0x10"` (16) and `"1e3"` (1000) as amounts. Only the `required.gt(pay)` check downstream stops a blank payment from being submitted, and the blank *rounding* field is silently read as `0`. This is the same helper the previous iterations filed (`use-debt-local-numeric`, iteration 9) — still present, so it is recurring.

**2. Two private copies of `useRecordRevision`.**

`src/hooks/use-record-revision.ts` exists, is shared by `pages/Record/use-records.ts`, `pages/Record/Search/use-data.ts`, `pages/Record/z-Detail/use-record-full.ts` and `pages/Home/use-stats.ts`, and its docstring states the rule: *"It lives in `src/hooks/` because four page folders … and the dashboard all need it; a page must not import another page's hook."*

`src/pages/Debt/use-data.ts:11-14` and `src/pages/Money/History/use-data.ts:14-17` each define the identical function under the same name:

```ts
function useRevision(): number {
  const res = useStream(service.record.get.revision, () => 0);   // Debt
  return res.type === "success" ? res.data : 0;
}
```

The Debt copy is byte-for-byte the record-revision hook; the Money one is the same for `service.money.entries.get.revision`.

**3. A third parse of `url_back`.**

`src/lib/utils.ts:getURLBack()` + `src/hooks/use-get-url-back.ts` are the shared path. `src/hooks/use-generate-url-back.ts:5-8` re-implements the parse inline:

```ts
const parsed = z.string().safeParse(search.get("url_back"));
if (parsed.success) return parsed.data;
```

Two of the three copies construct URLs from an unvalidated `url_back`, and none rejects an absolute or protocol-relative value (`//evil.com`). Under the hash router that is not an open redirect today, but the check belongs in one place so a future `<a href>` or `window.location` use cannot turn it into one.

## Why it matters

Every one of these is a place where a fix was applied to the shared helper and not to the copy. Case 1 is the live example: the app invested a comment, a test file and an iteration report in making `numerish` reject the empty string, and the one money dialog that needed it most still accepts it. Case 2 means a future change to how the revision counter is read (say, seeding it from the stream's first value, or debouncing) has to be found in three files; the shared file's own comment predicts this and says not to. Case 3 means a validation rule lives in three places with three different strengths.

The cost is not just tidiness: these are exactly the files where a money or navigation bug survives because the reviewer looked at the shared helper instead of the page's copy.

## Recommended fix

1. Delete the local `numeric` in `use-debt.ts` and import the shared one:
   ```ts
   import { z } from "zod";
   import { numerish } from "~/lib/utils";
   const schema = z.object({ pay: numerish, rounding: numerish });
   ```
   Then handle the now-possible `""` explicitly, which is what the cashier means by an empty field: default `rounding` to `"0"`, and let `pay` fail validation with a message ("Bayaran wajib diisi.") rather than reaching the underpayment check with `0`.
2. Delete the two local `useRevision` functions; add a small `useRevisionOf(stream)` in `src/hooks/` (or a `useMoneyRevision` beside `useRecordRevision`) and have `Debt/use-data.ts` and `Money/History/use-data.ts` import it.
3. Make `useGenerateUrlBack` call `getURLBack(base, search)` instead of parsing `url_back` itself, and — since all three copies validate with `z.string()` — tighten the shared one to reject values that are not in-app paths (start with `/` and not `//`), so the rule lives once and is enforced everywhere.

## Acceptance criteria

- `rg -n "refine\(.*Number\.isFinite" src` finds only `src/lib/utils.ts`.
- `rg -n "get\.revision" src` finds only `src/hooks/use-record-revision.ts` (and a single new money counterpart), not page files.
- `rg -n "url_back" src` shows one parser, called from every reader.
- An empty "Bayaran" in `Bayar Kredit` shows a validation message instead of submitting `0`.
- A `url_back` of `//evil.com` or `https://evil.com` falls back to the caller's default path.

## Verification

1. Unit test on the new shared schema: `""`, `" "`, `"0x10"`, `"1e3"` are rejected; `"0"` and `"50000"` accepted.
2. `bun test` plus `tsc --noEmit` after removing the copies (a leftover import is a type error).
3. Manual: open `Bayar Kredit`, leave "Bayaran" blank, press Bayar — a message appears and nothing is submitted; then type `0` — the underpayment guard speaks.
