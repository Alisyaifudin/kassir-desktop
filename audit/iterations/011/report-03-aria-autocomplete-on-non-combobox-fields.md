---
slug: aria-autocomplete-on-non-combobox-fields
title: "`aria-autocomplete=\"list\"` copy-pasted onto 34 non-combobox fields, including password and number inputs where it is invalid ARIA"
severity: medium
category: accessibility
iteration: 11
created: 2026-10-21T22:16:52.163Z
files:
  - "src/pages/Record/Item/z-Detail/z-Debt/index.tsx"
  - "src/pages/Setting/Profile/z-PasswordForm.tsx"
  - "src/pages/Money/History/z-NewRecord.tsx"
  - "src/components/Calendar.tsx"
  - "src/components/DateRange.tsx"
  - "src/pages/Customer/z-Item.tsx"
  - "src/components/ui/combobox.tsx"
---

# `aria-autocomplete="list"` copy-pasted onto 34 non-combobox fields, including password and number inputs where it is invalid ARIA

- **Severity:** medium
- **Category:** accessibility
- **Files:** `src/pages/Record/Item/z-Detail/z-Debt/index.tsx`, `src/pages/Setting/Profile/z-PasswordForm.tsx`, `src/pages/Money/History/z-NewRecord.tsx`, `src/components/Calendar.tsx`, `src/components/DateRange.tsx`, `src/pages/Customer/z-Item.tsx`, `src/components/ui/combobox.tsx`
- **Iteration:** 11

## Summary

`aria-autocomplete="list"` is a combobox-only attribute but appears on 34 fields with no popup — including `type="number"` money/settlement inputs and a password field, where the attribute is flat-out invalid ARIA, and on plain text inputs where it announces an autocomplete suggestion list that will never open. Only `ui/combobox.tsx:149` uses it correctly; the money fields it appears on are the worst place to promise fuzzy suggestions.

## Details

## Evidence

`aria-autocomplete="list"` is a combobox-only attribute: it tells assistive tech the field has a popup of suggestions it can navigate. It is correct in exactly one file — `src/components/ui/combobox.tsx:149`, which really is an `aria-expanded` combobox with a listbox. It has been copy-pasted onto **34 other fields** that have no popup at all:

```
components/Calendar.tsx:359            (year drill-down, type="number")
components/DateRange.tsx:479           (year drill-down, type="number")
pages/Customer/z-Item.tsx:39,56        (name, phone)
pages/Customer/z-NewCustomer.tsx:55,72
pages/Cashier/z-NewCashier.tsx:54      (cashier name)
pages/Cashier/z-Item.tsx:48
pages/Social/z-Item.tsx:46,61 ; pages/Social/z-NewItem.tsx:51,67
pages/Method/z-Item.tsx:29 ; pages/Method/z-NewBtn.tsx:33
pages/Extra/z-ShortField.tsx:23 ; pages/Extra/z-Search.tsx:31
pages/Money/History/z-NewRecord.tsx:55 (money value, type="number")
pages/Record/Item/z-Detail/z-Debt/index.tsx:63,81 (pay, rounding, type="number")
pages/Record/Search/z-Search.tsx:68 ; pages/Record/z-Header/SearchBars.tsx:40
pages/Setting/Shop/z-Info.tsx:37,54,70,87
pages/Setting/Profile/z-Name.tsx:18
pages/Setting/Profile/z-PasswordForm.tsx:34   ← a password field
pages/Login/z-FreshForm.tsx:44,62,80 ; pages/Login/z-LoginForm.tsx:106
components/cart/z-Extras.tsx:408 ; components/cart/z-Listing.tsx:565
```

Two shapes are actively invalid rather than merely unhelpful:

- On `type="number"` inputs the implicit role is `spinbutton`, and `aria-autocomplete` is not allowed on `spinbutton` — e.g. the debt "Bayaran" field (`z-Debt/index.tsx:63`), the money-ledger value (`z-NewRecord.tsx:55`) and both year drill-downs.
- On a password field (`Setting/Profile/z-PasswordForm.tsx:34`) the hint implies suggestions for a value the app must never suggest.

Elsewhere it is legal ARIA but false: the field has no listbox, no `aria-controls`, no `aria-expanded`, and no suggestion list, so a screen reader announces "has autocomplete" for a plain text input, and a user is invited to look for a popup that will never open.

The cart grids take the opposite, correct approach for the fields that *do* have results (`z-SearchResults.tsx` renders a real listbox and the results are a real grid), which is why this looks like leftover boilerplate from a shadcn snippet rather than a design decision.

## Why it matters

This is a POS: the operator may be blind or low-vision and using a screen reader over a keyboard-only workflow. An autocomplete announcement on the payment, rounding and debt-settlement fields is worse than silence — it promises a fuzzy-matching popup on the one screen where a wrong amount is money. It is also the cheapest kind of defect to fix, and the field set it appears on (money, login, settings) is exactly where trust in the app's other spoken output is built.

## Recommended fix

1. Delete the attribute from all 34 non-combobox sites (a single pass; `rg -n 'aria-autocomplete' src` then remove where the element is not the combobox input).
2. If any of the search fields should become comboboxes later, that is a separate change: `role="combobox"` + `aria-expanded` + `aria-controls` + `aria-activedescendant`, like `combobox.tsx` already does.
3. Add a guard next to the existing ARIA guards (`src/lib/design-tokens.test.ts`, `icon-buttons.test.ts`): `aria-autocomplete` may only appear in a file that also contains `role="combobox"`.

## Acceptance criteria

- `rg -n 'aria-autocomplete' src` matches only `src/components/ui/combobox.tsx`.
- A source-scan test fails if `aria-autocomplete` appears without `role="combobox"` in the same file.
- No `type="number"`, `type="password"` or `<Textarea>` carries `aria-autocomplete`.

## Verification

- `bun test` (new guard), `npx tsc --noEmit`, `npx eslint . --max-warnings 0`.
- Manual/NVDA: focus the debt dialog's "Bayaran" — it announces "Bayaran, spin button", with no autocomplete hint.
