---
slug: design-token-guard-blind-spots
title: "`text-mormal` typo and 13 fixed-size icons slip past a guard that only knows two hard-coded-size shapes"
severity: low
category: ux
iteration: 10
created: 2026-10-21T21:52:33.465Z
files:
  - "src/lib/design-tokens.test.ts"
  - "src/components/Calendar.tsx"
  - "src/components/DateRange.tsx"
  - "src/components/ui/dialog.tsx"
  - "src/components/ui/checkbox.tsx"
  - "src/pages/Setting/Data/ProductUpload/z-Selected.tsx"
  - "src/pages/Money/History/z-UploadDialog/z-Selected.tsx"
  - "src/global.css"
---

# `text-mormal` typo and 13 fixed-size icons slip past a guard that only knows two hard-coded-size shapes

- **Severity:** low
- **Category:** ux
- **Files:** `src/lib/design-tokens.test.ts`, `src/components/Calendar.tsx`, `src/components/DateRange.tsx`, `src/components/ui/dialog.tsx`, `src/components/ui/checkbox.tsx`, `src/pages/Setting/Data/ProductUpload/z-Selected.tsx`, `src/pages/Money/History/z-UploadDialog/z-Selected.tsx`, `src/global.css`
- **Iteration:** 10

## Summary

The design-token guard recognises only `text-xs|sm|lg|…|[Npx]` and lucide `size={N}`, so two other hard-coded-size shapes have already shipped: a misspelled `text-mormal` in both date pickers (no such utility, so two `DialogTitle` headings fall back to 16px inside a 30px dialog) and thirteen icons sized with fixed `w-4 h-4` / `h-6 w-6` / `h-12 w-12` instead of the `icon` utility that re-resolves per app size — including the shared dialog close button.

## Details

## Evidence

The typography/size guard (`src/lib/design-tokens.test.ts`) only recognises two shapes:

```ts
const FORBIDDEN = /(?<![\w-])text-(?:xs|sm|base|lg|xl|[2-9]xl|\[[^\]]+\])(?![\w-])/g;
const SIZE_ATTRIBUTE = /(?<![\w-])size=\{\s*\d+\s*\}\}/g;
```

Two other ways to hard-code a size are therefore unchecked, and both already have shipped instances.

**1. A misspelled token class, which silently does nothing.** `text-mormal` has no declaration, so Tailwind emits no rule and `DialogTitle` falls back to the preflight `font-size: inherit`:

- `src/components/Calendar.tsx:152` — `<DialogTitle className="text-mormal">` (the day view's month/year heading)
- `src/components/DateRange.tsx:251` — same string, the picker's month heading

`src/global.css:356-364` defines exactly four tokens (`--text-big/normal/small/tiny`) and `@layer base` force-sizes only `p, textarea, button, a, label, select, input, span`. A Radix `DialogTitle` is an `<h2>`, and Tailwind preflight sets `h1..h6 { font-size: inherit }`, so those two headings render at the dialog's inherited body size while the sibling heading in the same dialog uses `text-normal` (30px at `big`, 20px at `small`). The header visibly changes size between the day view and the month view of the same picker.

**2. Icons sized with fixed utilities instead of the `icon` utility.** `@utility icon { width: var(--icon-size); height: var(--icon-size) }` (`src/global.css:367-370`) is the only thing that re-resolves per app size (`--icon-size: 30px` → 20px under `.small`). Thirteen call sites bypass it:

```
src/components/ui/dialog.tsx:52          <X className="h-12 w-12" />        // every dialog's close button
src/components/ui/checkbox.tsx:20        <Check className="h-6 w-6" />
src/components/ui/breadcrumb.tsx:100     <MoreHorizontal className="h-4 w-4" />
src/components/ui/pagination.tsx:83      <MoreHorizontal className="h-4 w-4" />
src/components/ErrorBoundary.tsx:126     <Terminal className="w-4 h-4" />
src/pages/Setting/Data/ProductUpload/z-Schema.tsx:35   <HelpCircle className="w-4 h-4" />
src/pages/Setting/Data/ProductUpload/z-Selected.tsx:97 <X className="w-4 h-4" />   // cancel an upload
src/pages/Setting/Data/RecordUpload/z-Schema.tsx:44    <HelpCircle className="w-4 h-4" />
src/pages/Setting/Data/RecordUpload/z-Selected.tsx:94  <X className="w-4 h-4" />
src/pages/Setting/Data/z-Skipped.tsx:33                <X className="w-4 h-4" />
src/pages/Money/History/z-UploadDialog/z-Selected.tsx:107,145 <X className="w-4 h-4" />
```

The `w-4 h-4` cluster is the import/skip panels — 16px glyphs on screens whose body copy is 30px in `big` mode — and `h-12 w-12` makes the shared dialog close button a 48px glyph that stays 48px when every other icon drops to 20px.

## Why it matters

The whole point of the token system (and of `design-tokens.test.ts`) is that the app has two supported sizes and no component may be correct at only one of them. The guard gives false confidence: it is green while two headings render at 16px and the app's most-clicked icon (the dialog close button) ignores the size mode. `text-mormal` is also indistinguishable from a typo'd token anywhere else — a future copy/paste spreads it — and the guard would still pass. Neither instance is a crash; both are the exact class of drift the test was written to stop, and they are cheap to fix.

## Recommended fix

1. Fix the two typos: `text-mormal` → `text-normal` in `Calendar.tsx:152` and `DateRange.tsx:251`.
2. Replace the fixed icon sizes with the token utility, using a size class only where a deliberately larger glyph is wanted (the convention already documented in `design-tokens.test.ts`):
   - `ui/dialog.tsx:52` → `<X className="icon" />` (the close button already has a 48px hit area from its padding/`absolute` box; keep the hit area, shrink the glyph);
   - the `w-4 h-4` / `h-6 w-6` sites → `className="icon"`.
3. Widen the guard so the class of bug cannot come back. Two additions to `src/lib/design-tokens.test.ts`:
   - a positive check that every `text-*` token class used in `src/**/*.tsx` is one of the four declared names plus the two custom sizes (`change`, `grand-total`) — i.e. flag *unknown* `text-…` names, which is what catches `text-mormal`;
   - extend the icon rule from `size={N}` to also flag a lucide component whose `className` contains a fixed `w-/h-/size-` pair, with an explicit allow-list for the intentionally large decorative glyphs.

## Acceptance criteria

- `rg "text-mormal" src` returns nothing, and the two dialog headings render at the same size as their sibling titles in both `big` and `small` mode.
- No lucide icon is sized with fixed `w-4 h-4` / `h-6 w-6` / `h-12 w-12`; every one uses `className="icon"` or a documented `size-*` class.
- Toggling `body.small` changes the dialog close glyph and the upload-panel icons in step with the rest of the UI.
- `design-tokens.test.ts` fails if either an unknown `text-*` token name or a fixed-size icon class is introduced.

## Verification

1. `bun test src/lib/design-tokens.test.ts` after adding the two new rules — must fail on the current tree (proving the rules work), then pass after the fixes.
2. Visual: open Setting > Data, switch the app size in Setting > Toko and confirm the X/help glyphs shrink with everything else; open any dialog and confirm the close button is no longer an outlier.
3. Open the Records day picker, drill into the month view, confirm the heading matches the day view's heading size.
